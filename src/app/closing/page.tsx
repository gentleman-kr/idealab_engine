"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computeFullDashboard, macroTrendMultiplier } from "@/lib/calculations";
import { uid } from "@/lib/id";
import {
  loadClosingHypotheses,
  loadClosingInputs,
  saveClosingHypotheses,
  saveClosingInputs,
  type ClosingHypothesisState,
  type ClosingInputs,
} from "@/lib/closingStorage";
import { defaultMeceDiagnosis, pickBottleneck, type MeceDiagnosis } from "@/lib/meceBottleneck";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatKrw(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("ko-KR");
}

function formatPct01(x: number) {
  const v = Number.isFinite(x) ? x : 0;
  return `${Math.round(v * 100)}%`;
}

async function rasterizeA4(el: HTMLElement, scale = 3) {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return await html2canvas(el, {
    backgroundColor: "#000000",
    scale,
    useCORS: true,
    logging: false,
  });
}

function addA4Image(doc: jsPDF, canvas: HTMLCanvasElement) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const img = canvas.toDataURL("image/jpeg", 0.92);

  const w = canvas.width;
  const h = canvas.height;

  // Fill page background to avoid white borders.
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, pageH, "F");

  // Contain with margin: avoids cropping (report-style).
  const margin = 24; // pt
  const maxW = Math.max(0, pageW - margin * 2);
  const maxH = Math.max(0, pageH - margin * 2);
  const scale = Math.min(maxW / w, maxH / h);
  const drawW = w * scale;
  const drawH = h * scale;
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;
  doc.addImage(img, "JPEG", x, y, drawW, drawH, undefined, "FAST");
}

const DEFAULT_INPUTS: ClosingInputs = {
  monthlyRevenueKrw: 2_000_000,
  weeklyHours: 50,
  consultingCostKrw: 4_000_000,
  macroTrend: 5,
};

const PRESETS: Array<{ id: string; label: string; inputs: ClosingInputs }> = [
  { id: "starter", label: "월 200만 · 50h", inputs: DEFAULT_INPUTS },
  {
    id: "growing",
    label: "월 1,000만 · 55h",
    inputs: { monthlyRevenueKrw: 10_000_000, weeklyHours: 55, consultingCostKrw: 5_000_000, macroTrend: 6 },
  },
  {
    id: "scale",
    label: "월 3,000만 · 60h",
    inputs: { monthlyRevenueKrw: 30_000_000, weeklyHours: 60, consultingCostKrw: 10_000_000, macroTrend: 6 },
  },
];

const DEFAULT_HYP: ClosingHypothesisState = {
  mece: defaultMeceDiagnosis(),
  problemStatement: "",
  issueTree: [
    { id: "issue1", label: "리드 품질/타겟팅" },
    { id: "issue2", label: "오퍼(가치 방정식)" },
    { id: "issue3", label: "전환/세일즈 프로세스" },
  ],
  hypotheses: [
    { id: "hyp1", issueId: "issue2", statement: "오퍼의 Dream/Likelihood 증거를 3개로 고정하면 무료→유료 전환이 2주 내 상승한다." },
  ],
  experiment: {
    durationWeeks: 2,
    kpi: "무료→유료 전환율(%)",
    successCriteria: "전환율 +20% 상대 상승 또는 리드당 매출 +10% 이상",
    nextAction: "오늘 안에 ‘한 문장 결론 + 증거 3개 + CTA 1개’로 랜딩/뉴스레터/DM 스크립트를 통일한다.",
  },
};

export default function ClosingPage() {
  const [inputs, setInputs] = useState<ClosingInputs>(DEFAULT_INPUTS);
  const [hyp, setHyp] = useState<ClosingHypothesisState>(DEFAULT_HYP);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);
  const a4Ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedInputs = loadClosingInputs();
    const savedHyp = loadClosingHypotheses();
    if (savedInputs) setInputs(savedInputs);
    if (savedHyp) {
      setHyp({
        ...DEFAULT_HYP,
        ...savedHyp,
        mece: (savedHyp.mece as unknown as MeceDiagnosis) ?? DEFAULT_HYP.mece,
      });
    }
  }, []);

  useEffect(() => {
    saveClosingInputs(inputs);
  }, [inputs]);

  useEffect(() => {
    saveClosingHypotheses(hyp);
  }, [hyp]);

  const computed = useMemo(() => {
    const safe: ClosingInputs = {
      monthlyRevenueKrw: clamp(inputs.monthlyRevenueKrw, 0, 500_000_000),
      weeklyHours: clamp(inputs.weeklyHours, 0, 120),
      consultingCostKrw: clamp(inputs.consultingCostKrw, 0, 200_000_000),
      macroTrend: clamp(inputs.macroTrend, 1, 10),
    };
    return { safe, out: computeFullDashboard(safe) };
  }, [inputs]);

  const assumptions = useMemo(() => {
    const monthlyHours = computed.safe.weeklyHours * 4.33;
    const hourlyValue = computed.safe.monthlyRevenueKrw / Math.max(monthlyHours, 1e-6);
    const trendMultiplier = macroTrendMultiplier(computed.safe.macroTrend);
    return { monthlyHours, hourlyValue, trendMultiplier };
  }, [computed.safe]);

  const waterfallStacked = useMemo(() => {
    const e = Math.max(0, Math.round(computed.out.entropy.recoverableMonthlyKrw));
    const o = Math.max(0, Math.round(computed.out.offer.monthlyRevenueUpliftKrw));
    const p = Math.max(0, Math.round(computed.out.pipeline.totalMonthlyKrw));
    return [{ k: "월 총가치", Entropy: e, Offer: o, Pipeline: p }];
  }, [computed.out.entropy.recoverableMonthlyKrw, computed.out.offer.monthlyRevenueUpliftKrw, computed.out.pipeline.totalMonthlyKrw]);

  const beforeAfter = useMemo(() => {
    const before = computed.safe.monthlyRevenueKrw;
    const after = before + computed.out.conversion.monthlyCompositeKrw;
    return [
      { k: "AS-IS(월)", v: Math.round(before) },
      { k: "TO-BE(월)", v: Math.round(after) },
    ];
  }, [computed.safe.monthlyRevenueKrw, computed.out.conversion.monthlyCompositeKrw]);

  const headline = useMemo(() => {
    const monthly = Math.round(computed.out.conversion.monthlyCompositeKrw);
    const yearly = Math.round(computed.out.conversion.yearlyAdditionalRevenueKrw);
    const roi = computed.out.conversion.roiMultiple;
    const delta = Math.max(0, Math.round(computed.out.conversion.monthlyCompositeKrw));

    const levers = [
      { id: "entropy", label: "불필요 업무 회수(Entropy)", v: Math.round(computed.out.entropy.recoverableMonthlyKrw) },
      { id: "offer", label: "오퍼로 추가매출(Offer)", v: Math.round(computed.out.offer.monthlyRevenueUpliftKrw) },
      { id: "pipeline", label: "자동화+딥워크(Pipeline)", v: Math.round(computed.out.pipeline.totalMonthlyKrw) },
    ].sort((a, b) => b.v - a.v);
    const top = levers[0];

    const rec =
      top?.id === "offer"
        ? "오퍼 1줄(결론) + 증거 3개 + CTA 1개로 전 채널 메시지를 통일하세요."
        : top?.id === "pipeline"
          ? "자동화 1개를 골라 ‘주 2h 회수’가 보이게 만들고, 회수 시간은 딥워크로 고정하세요."
          : "주간 리뷰에서 ‘삭제 리스트’ 10개를 뽑고, 반복·잡무부터 시스템화/위임하세요.";

    const oneLine = `연 ${formatKrw(yearly)}원 가치(월 +${formatKrw(monthly)}원) · ROI ${roi.toFixed(1)}x`;
    const soWhat = delta > 0 ? `가장 큰 레버: ${top?.label ?? "—"} → 이번 주 1% 액션: ${rec}` : "입력값을 넣으면 ROI/레버/실험이 자동으로 정리됩니다.";

    return { oneLine, soWhat, topLabel: top?.label ?? "—" };
  }, [computed]);

  const mece = (hyp.mece as unknown as MeceDiagnosis) ?? DEFAULT_HYP.mece!;
  const bottleneck = useMemo(() => pickBottleneck(mece), [mece]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-[0.28em] text-white/60">IDEALAB · Less is More</p>
          <h1 className="mt-3 text-2xl font-semibold text-white md:text-3xl">Closing ROI + Hypothesis Engine</h1>
          <p className="mt-2 text-sm text-white/55">
            결론(ROI) → 근거(분해) → 실행(2주 실험). 미팅 중 입력만으로 ‘클로징용 1페이지’를 완성합니다.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <aside className="card p-5">
            <div className="text-xs font-semibold tracking-[0.28em] text-white/50">INPUTS</div>

            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.id} className="btn h-9 px-3 text-xs" type="button" onClick={() => setInputs(p.inputs)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div>
                <div className="label">현재 월 매출(원)</div>
                <input
                  className="input mt-2"
                  inputMode="numeric"
                  value={inputs.monthlyRevenueKrw}
                  onChange={(e) => setInputs((p) => ({ ...p, monthlyRevenueKrw: Number(e.target.value || 0) }))}
                />
              </div>
              <div>
                <div className="label">주당 업무 시간</div>
                <input
                  className="input mt-2"
                  inputMode="numeric"
                  value={inputs.weeklyHours}
                  onChange={(e) => setInputs((p) => ({ ...p, weeklyHours: Number(e.target.value || 0) }))}
                />
              </div>
              <div>
                <div className="label">컨설팅 비용(원)</div>
                <input
                  className="input mt-2"
                  inputMode="numeric"
                  value={inputs.consultingCostKrw}
                  onChange={(e) => setInputs((p) => ({ ...p, consultingCostKrw: Number(e.target.value || 0) }))}
                />
              </div>
              <div>
                <div className="label">거시 트렌드(1 역풍 ~ 10 순풍)</div>
                <input
                  className="input mt-2"
                  type="number"
                  min={1}
                  max={10}
                  value={inputs.macroTrend}
                  onChange={(e) => setInputs((p) => ({ ...p, macroTrend: Number(e.target.value || 5) }))}
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn" type="button" onClick={() => setInputs(DEFAULT_INPUTS)}>
                  입력 리셋
                </button>
                <button
                  className="btnPrimary"
                  type="button"
                  disabled={exporting}
                  onClick={async () => {
                    if (!a4Ref.current) return;
                    setExporting(true);
                    try {
                      const doc = new jsPDF({ unit: "pt", format: "a4" });
                      const canvas = await rasterizeA4(a4Ref.current, 3);
                      addA4Image(doc, canvas);
                      const file = `IDEALAB_Closing_${new Date().toISOString().slice(0, 10)}.pdf`;
                      doc.save(file);
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  {exporting ? "PDF 생성 중…" : "1페이지 PDF"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-black p-4">
              <div className="text-xs font-semibold tracking-[0.28em] text-white/50">ASSUMPTIONS</div>
              <div className="mt-3 grid gap-2 text-xs text-white/55">
                <div className="flex items-center justify-between">
                  <div className="text-white/45">월 업무시간(주×4.33)</div>
                  <div className="font-mono text-white">{assumptions.monthlyHours.toFixed(1)}h</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white/45">시간가치(월매출/월시간)</div>
                  <div className="font-mono text-white">{formatKrw(Math.round(assumptions.hourlyValue))}원/h</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-white/45">트렌드 가중</div>
                  <div className="font-mono text-white">{assumptions.trendMultiplier.toFixed(2)}x</div>
                </div>
                <div className="mt-2 rounded-lg border border-border bg-[#0B0B0B] p-3 text-[11px] leading-relaxed text-white/50">
                  엔진은 현재 입력값에서 <span className="text-white/70">회수 가능한 시간/추가매출/자동화 가치</span>를 합산해 ROI를 추정합니다.
                </div>
              </div>
            </div>
          </aside>

          <main className="grid gap-6">
            {/* Executive summary (PDF capture target) */}
            <div
              ref={reportRef}
              className="card p-6"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold tracking-[0.28em] text-white/50">EXECUTIVE SUMMARY</div>
                  <div className="mt-2 text-lg font-semibold text-white">{headline.oneLine}</div>
                  <div className="mt-2 text-sm text-white/55">{headline.soWhat}</div>
                </div>
                <div className="flex gap-2">
                  <div className="rounded-xl border border-border bg-black px-4 py-3">
                    <div className="text-xs text-white/45">월 총가치(합산)</div>
                    <div className="mt-1 text-xl font-semibold text-white">
                      {formatKrw(Math.round(computed.out.conversion.monthlyCompositeKrw))}원
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-black px-4 py-3">
                    <div className="text-xs text-white/45">컨설팅 비용</div>
                    <div className="mt-1 text-xl font-semibold text-white">{formatKrw(Math.round(computed.safe.consultingCostKrw))}원</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-black p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">Before → After (월)</div>
                    <div className="text-xs text-white/45">AS-IS vs TO-BE</div>
                  </div>
                  <div className="mt-4 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={beforeAfter} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#2A2A2A" vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="k" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value) => `${formatKrw(Number(value))}원`}
                          contentStyle={{
                            backgroundColor: "#111111",
                            border: "1px solid #2A2A2A",
                            borderRadius: 10,
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="v" fill="#00FAFF" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-black p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">근거 분해 (월, 누적)</div>
                    <div className="text-xs text-white/45">Entropy / Offer / Pipeline</div>
                  </div>
                  <div className="mt-4 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterfallStacked} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#2A2A2A" vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="k" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value) => `${formatKrw(Number(value))}원`}
                          contentStyle={{
                            backgroundColor: "#111111",
                            border: "1px solid #2A2A2A",
                            borderRadius: 10,
                            color: "#fff",
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }} />
                        <Bar dataKey="Entropy" stackId="a" fill="#FFAA00" />
                        <Bar dataKey="Offer" stackId="a" fill="#00FAFF" />
                        <Bar dataKey="Pipeline" stackId="a" fill="#00CC66" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 text-xs text-white/45">
                    총합(월): <span className="font-mono text-white">{formatKrw(Math.round(computed.out.conversion.monthlyCompositeKrw))}원</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-black p-5">
                <div className="text-sm font-semibold text-white">
                  {Math.max(1, hyp.experiment.durationWeeks)}주 실험(가설 기반 문제 해결)
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold tracking-[0.28em] text-white/50">PROBLEM</div>
                    <textarea
                      className="input mt-2 h-20 resize-none py-2"
                      value={hyp.problemStatement}
                      onChange={(e) => setHyp((p) => ({ ...p, problemStatement: e.target.value }))}
                      placeholder="예: 리드가 늘어도 유료 전환이 낮아, 월 매출이 정체된다."
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-[0.28em] text-white/50">NEXT ACTION (THIS WEEK)</div>
                    <textarea
                      className="input mt-2 h-20 resize-none py-2"
                      value={hyp.experiment.nextAction}
                      onChange={(e) => setHyp((p) => ({ ...p, experiment: { ...p.experiment, nextAction: e.target.value } }))}
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-border bg-[#070707] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold tracking-[0.28em] text-white/50">MECE DIAGNOSIS</div>
                      <div className="mt-2 text-sm text-white/60">
                        병목은 <span className="text-white/80">Impact × Weakness × Confidence / (Time × Effort)</span>로 선정합니다.
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-black px-4 py-3">
                      <div className="text-xs text-white/45">Bottleneck (Constraint)</div>
                      <div className="mt-1 text-sm font-semibold text-cyan">{bottleneck.label}</div>
                      <div className="mt-1 text-xs text-white/50">
                        추천 레버: <span className="text-white/75">{bottleneck.playbook.toUpperCase()}</span> · KPI:{" "}
                        <span className="text-white/75">{bottleneck.kpi}</span>
                      </div>
                      <div className="mt-1 text-xs text-white/45">
                        Impact(월): <span className="font-mono text-white/75">{formatKrw(Math.round(bottleneck.impactKrwMonthly))}원</span> · Time:{" "}
                        <span className="font-mono text-white/75">{Math.round(bottleneck.timeWeeks)}w</span> · Effort:{" "}
                        <span className="font-mono text-white/75">{Math.round(bottleneck.effort)}/5</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-6">
                    {(
                      [
                        { key: "demand", label: "DEMAND", items: [
                          { id: "positioning", label: "포지셔닝/타겟" },
                          { id: "channelFit", label: "채널-오퍼 적합" },
                          { id: "leadQuality", label: "리드 품질" },
                        ] as const },
                        { key: "conversion", label: "CONVERSION", items: [
                          { id: "offerStrength", label: "오퍼(가치방정식)" },
                          { id: "trustProof", label: "신뢰/증거" },
                          { id: "salesFriction", label: "세일즈 마찰" },
                        ] as const },
                        { key: "delivery", label: "DELIVERY", items: [
                          { id: "deliveryQuality", label: "전달 품질/납기" },
                          { id: "automation", label: "자동화/반복 제거" },
                          { id: "retention", label: "리텐션/재구매" },
                        ] as const },
                        { key: "energy", label: "ENERGY", items: [
                          { id: "focusTime", label: "집중시간(딥워크)" },
                          { id: "decisionFatigue", label: "잡무/의사결정 피로" },
                          { id: "weeklyReview", label: "주간 리뷰 시스템" },
                        ] as const },
                      ] as const
                    ).map((bucket) => (
                      <div key={bucket.key} className="rounded-2xl border border-border bg-[#0B0B0B] p-5">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold tracking-[0.28em] text-white/50">{bucket.label}</div>
                          <div className="text-xs text-white/35">Strength · Confidence · Impact · Time · Effort</div>
                        </div>
                        <div className="mt-4 grid gap-3">
                          {bucket.items.map((it) => {
                            const v = (mece as any)[bucket.key]?.[it.id] ?? {
                              strength: 6,
                              confidence: 0.6,
                              impactKrwMonthly: 2_000_000,
                              timeWeeks: 2,
                              effort: 3,
                              note: "",
                            };
                            const isBottleneck = bottleneck.id === it.id;
                            return (
                              <div
                                key={it.id}
                                className={`rounded-xl border p-4 ${isBottleneck ? "border-cyan/60 bg-black" : "border-border bg-black"}`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="text-sm font-semibold text-white">
                                    {it.label} {isBottleneck ? <span className="ml-2 text-xs text-cyan">CONSTRAINT</span> : null}
                                  </div>
                                  <div className="text-xs text-white/40">근거를 높일수록 추천 정확도가 올라갑니다.</div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3">
                                  <div className="min-w-[140px] flex-1">
                                    <div className="label">Strength</div>
                                    <input
                                      className="input mt-2"
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={v.strength}
                                      onChange={(e) =>
                                        setHyp((p) => ({
                                          ...p,
                                          mece: {
                                            ...(p.mece ?? DEFAULT_HYP.mece),
                                            [bucket.key]: {
                                              ...((p.mece as any)?.[bucket.key]),
                                              [it.id]: { ...v, strength: Number(e.target.value || 6) },
                                            },
                                          } as any,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="min-w-[140px] flex-1">
                                    <div className="label">Confidence</div>
                                    <input
                                      className="input mt-2"
                                      type="number"
                                      min={0.2}
                                      max={0.95}
                                      step={0.05}
                                      value={v.confidence}
                                      onChange={(e) =>
                                        setHyp((p) => ({
                                          ...p,
                                          mece: {
                                            ...(p.mece ?? DEFAULT_HYP.mece),
                                            [bucket.key]: {
                                              ...((p.mece as any)?.[bucket.key]),
                                              [it.id]: { ...v, confidence: Number(e.target.value || 0.6) },
                                            },
                                          } as any,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="min-w-[160px] flex-1">
                                    <div className="label">Impact(월,원)</div>
                                    <input
                                      className="input mt-2"
                                      inputMode="numeric"
                                      value={v.impactKrwMonthly ?? 0}
                                      onChange={(e) =>
                                        setHyp((p) => ({
                                          ...p,
                                          mece: {
                                            ...(p.mece ?? DEFAULT_HYP.mece),
                                            [bucket.key]: {
                                              ...((p.mece as any)?.[bucket.key]),
                                              [it.id]: { ...v, impactKrwMonthly: Number(e.target.value || 0) },
                                            },
                                          } as any,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="min-w-[110px] flex-1">
                                    <div className="label">Time(w)</div>
                                    <input
                                      className="input mt-2"
                                      type="number"
                                      min={1}
                                      max={12}
                                      value={v.timeWeeks ?? 2}
                                      onChange={(e) =>
                                        setHyp((p) => ({
                                          ...p,
                                          mece: {
                                            ...(p.mece ?? DEFAULT_HYP.mece),
                                            [bucket.key]: {
                                              ...((p.mece as any)?.[bucket.key]),
                                              [it.id]: { ...v, timeWeeks: Number(e.target.value || 2) },
                                            },
                                          } as any,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="min-w-[110px] flex-1">
                                    <div className="label">Effort(1-5)</div>
                                    <input
                                      className="input mt-2"
                                      type="number"
                                      min={1}
                                      max={5}
                                      value={v.effort ?? 3}
                                      onChange={(e) =>
                                        setHyp((p) => ({
                                          ...p,
                                          mece: {
                                            ...(p.mece ?? DEFAULT_HYP.mece),
                                            [bucket.key]: {
                                              ...((p.mece as any)?.[bucket.key]),
                                              [it.id]: { ...v, effort: Number(e.target.value || 3) },
                                            },
                                          } as any,
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <div>
                                    <div className="label">Evidence / Note</div>
                                    <input
                                      className="input mt-2"
                                      value={v.note ?? ""}
                                      onChange={(e) =>
                                        setHyp((p) => ({
                                          ...p,
                                          mece: {
                                            ...(p.mece ?? DEFAULT_HYP.mece),
                                            [bucket.key]: {
                                              ...((p.mece as any)?.[bucket.key]),
                                              [it.id]: { ...v, note: e.target.value },
                                            },
                                          } as any,
                                        }))
                                      }
                                      placeholder="예: 최근 2주 전환율 0.8% / 후기 0개 / DM 응답률 3%"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => setHyp((p) => ({ ...p, mece: defaultMeceDiagnosis() as any }))}
                    >
                      MECE 리셋
                    </button>
                    <button
                      className="btnPrimary"
                      type="button"
                      onClick={() => {
                        const b = bottleneck;
                        const nextProblem = hyp.problemStatement?.trim()
                          ? hyp.problemStatement
                          : `현재 병목은 "${b.label}"로 인해 성장 속도가 제한된다.`;
                        setHyp((p) => ({
                          ...p,
                          problemStatement: nextProblem,
                          issueTree: [
                            { id: "demand", label: "Demand(수요)" },
                            { id: "conversion", label: "Conversion(전환)" },
                            { id: "delivery", label: "Delivery(전달)" },
                            { id: "energy", label: "Energy(에너지)" },
                          ],
                          hypotheses: [
                            {
                              id: uid("hyp"),
                              issueId: b.bucket,
                              statement: `만약 ${b.label}을(를) 개선하면, ${b.kpi}가 ${Math.max(1, p.experiment.durationWeeks)}주 내 개선된다.`,
                            },
                          ],
                          experiment: {
                            ...p.experiment,
                            kpi: b.kpi,
                            nextAction: b.recommendation,
                          },
                        }));
                      }}
                    >
                      병목 기반으로 실험 초안 채우기
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-1 lg:gap-6">
                  <div className="rounded-2xl border border-border bg-[#0B0B0B] p-5">
                    <div className="text-xs font-semibold tracking-[0.28em] text-white/50">ISSUE TREE</div>
                    <div className="mt-3 space-y-2">
                      {hyp.issueTree.map((n) => (
                        <div key={n.id} className="flex items-center gap-2">
                          <input
                            className="input h-9"
                            value={n.label}
                            onChange={(e) =>
                              setHyp((p) => ({
                                ...p,
                                issueTree: p.issueTree.map((x) => (x.id === n.id ? { ...x, label: e.target.value } : x)),
                              }))
                            }
                          />
                          <button
                            className="btn h-9 px-3 text-xs"
                            type="button"
                            onClick={() =>
                              setHyp((p) => ({
                                ...p,
                                issueTree: p.issueTree.filter((x) => x.id !== n.id),
                                hypotheses: p.hypotheses.map((h) => (h.issueId === n.id ? { ...h, issueId: undefined } : h)),
                              }))
                            }
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn w-full"
                        type="button"
                        onClick={() => setHyp((p) => ({ ...p, issueTree: [...p.issueTree, { id: uid("issue"), label: "" }] }))}
                      >
                        + 이슈 추가
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-[#0B0B0B] p-5">
                    <div className="text-xs font-semibold tracking-[0.28em] text-white/50">HYPOTHESES</div>
                    <div className="mt-3 space-y-3">
                      {hyp.hypotheses.map((h) => (
                        <div key={h.id} className="rounded-lg border border-border bg-black p-3">
                          <div className="flex gap-2">
                            <select
                              className="input h-9 w-40"
                              value={h.issueId ?? ""}
                              onChange={(e) =>
                                setHyp((p) => ({
                                  ...p,
                                  hypotheses: p.hypotheses.map((x) => (x.id === h.id ? { ...x, issueId: e.target.value || undefined } : x)),
                                }))
                              }
                            >
                              <option value="">(이슈 선택)</option>
                              {hyp.issueTree.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.label || n.id}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn h-9 px-3 text-xs"
                              type="button"
                              onClick={() => setHyp((p) => ({ ...p, hypotheses: p.hypotheses.filter((x) => x.id !== h.id) }))}
                            >
                              삭제
                            </button>
                          </div>
                          <textarea
                            className="input mt-2 h-20 resize-none py-2"
                            value={h.statement}
                            onChange={(e) =>
                              setHyp((p) => ({
                                ...p,
                                hypotheses: p.hypotheses.map((x) => (x.id === h.id ? { ...x, statement: e.target.value } : x)),
                              }))
                            }
                            placeholder="예: ○○를 바꾸면 △△ KPI가 2주 내 개선된다."
                          />
                        </div>
                      ))}
                      <button
                        className="btn w-full"
                        type="button"
                        onClick={() => setHyp((p) => ({ ...p, hypotheses: [...p.hypotheses, { id: uid("hyp"), statement: "" }] }))}
                      >
                        + 가설 추가
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-[#0B0B0B] p-5">
                    <div className="text-xs font-semibold tracking-[0.28em] text-white/50">
                      EXPERIMENT ({Math.max(1, hyp.experiment.durationWeeks)} WEEKS)
                    </div>
                    <div className="mt-3 grid gap-3">
                      <div>
                        <div className="label">기간(주)</div>
                        <input
                          className="input mt-2"
                          type="number"
                          min={1}
                          max={12}
                          value={hyp.experiment.durationWeeks}
                          onChange={(e) =>
                            setHyp((p) => ({
                              ...p,
                              experiment: { ...p.experiment, durationWeeks: Number(e.target.value || 2) },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <div className="label">KPI</div>
                        <input
                          className="input mt-2"
                          value={hyp.experiment.kpi}
                          onChange={(e) => setHyp((p) => ({ ...p, experiment: { ...p.experiment, kpi: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <div className="label">성공 조건</div>
                        <textarea
                          className="input mt-2 h-20 resize-none py-2"
                          value={hyp.experiment.successCriteria}
                          onChange={(e) => setHyp((p) => ({ ...p, experiment: { ...p.experiment, successCriteria: e.target.value } }))}
                        />
                      </div>
                      <button className="btn" type="button" onClick={() => setHyp(DEFAULT_HYP)}>
                        템플릿 리셋
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-white/40">
                본 수치는 입력 기반의 추정치이며, 실행·시장·규제·채널 변화에 따라 달라질 수 있습니다.
              </div>
            </div>

            {/* Offscreen fixed A4 page for export */}
            {/* Keep it rendered but offscreen so html2canvas captures reliably */}
            <div
              className="pointer-events-none fixed left-0 top-0"
              style={{ transform: "translateX(-200vw)" }}
            >
              <div
                ref={a4Ref}
                className="relative h-[1123px] w-[794px] overflow-hidden rounded-none bg-black text-white"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                  backgroundSize: "56px 56px",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-cyan/10 via-transparent to-transparent" />
                <div className="relative h-full p-12">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-xs font-semibold tracking-[0.35em] text-white/55">IDEALAB · Less is More</div>
                      <div className="mt-4 text-4xl font-semibold tracking-tight">Closing Summary</div>
                      <div className="mt-3 text-sm text-white/60">
                        {headline.oneLine}
                        <div className="mt-2 text-white/55">{headline.soWhat}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-[#0B0B0B] px-5 py-4 text-right">
                      <div className="text-xs text-white/45">Experiment</div>
                      <div className="mt-1 text-3xl font-semibold text-cyan">
                        {Math.max(1, hyp.experiment.durationWeeks)}w
                      </div>
                      <div className="mt-2 text-xs text-white/45">{hyp.experiment.kpi}</div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-border bg-[#0B0B0B] p-6">
                      <div className="text-xs text-white/45">Yearly value</div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {formatKrw(Math.round(computed.out.conversion.yearlyAdditionalRevenueKrw))}원
                      </div>
                      <div className="mt-2 text-xs text-white/45">trend {assumptions.trendMultiplier.toFixed(2)}x</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-[#0B0B0B] p-6">
                      <div className="text-xs text-white/45">Monthly composite</div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        +{formatKrw(Math.round(computed.out.conversion.monthlyCompositeKrw))}원
                      </div>
                      <div className="mt-2 text-xs text-white/45">
                        hourly {formatKrw(Math.round(assumptions.hourlyValue))}원/h
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-[#0B0B0B] p-6">
                      <div className="text-xs text-white/45">ROI multiple</div>
                      <div className="mt-2 text-2xl font-semibold text-cyan">{computed.out.conversion.roiMultiple.toFixed(1)}x</div>
                      <div className="mt-2 text-xs text-white/45">
                        cost {formatKrw(Math.round(computed.safe.consultingCostKrw))}원
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 rounded-2xl border border-border bg-[#0B0B0B] p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <div className="text-xs font-semibold tracking-[0.35em] text-white/55">BOTTLENECK</div>
                        <div className="mt-2 text-2xl font-semibold text-cyan">{bottleneck.label}</div>
                        <div className="mt-2 text-sm text-white/60">
                          레버: <span className="text-white/80">{bottleneck.playbook.toUpperCase()}</span> · KPI:{" "}
                          <span className="text-white/80">{bottleneck.kpi}</span>
                        </div>
                        <div className="mt-2 text-xs text-white/45">
                          Impact(월):{" "}
                          <span className="font-mono text-white/75">{formatKrw(Math.round(bottleneck.impactKrwMonthly))}원</span> · Time:{" "}
                          <span className="font-mono text-white/75">{Math.round(bottleneck.timeWeeks)}w</span> · Effort:{" "}
                          <span className="font-mono text-white/75">{Math.round(bottleneck.effort)}/5</span>
                        </div>
                      </div>
                      <div className="w-[320px] rounded-2xl border border-border bg-black p-5">
                        <div className="text-xs text-white/45">Recommended action</div>
                        <div className="mt-2 text-sm leading-relaxed text-white/75">{bottleneck.recommendation}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-6">
                    <div className="h-[320px] rounded-2xl border border-border bg-[#0B0B0B] p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">Before → After (월)</div>
                        <div className="text-xs text-white/45">AS-IS vs TO-BE</div>
                      </div>
                      <div className="mt-3 h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={beforeAfter} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#2A2A2A" vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="k" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Bar dataKey="v" fill="#00FAFF" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="h-[320px] rounded-2xl border border-border bg-[#0B0B0B] p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">Value breakdown (월)</div>
                        <div className="text-xs text-white/45">stacked</div>
                      </div>
                      <div className="mt-3 h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={waterfallStacked} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#2A2A2A" vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="k" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Bar dataKey="Entropy" stackId="a" fill="#FFAA00" />
                            <Bar dataKey="Offer" stackId="a" fill="#00FAFF" />
                            <Bar dataKey="Pipeline" stackId="a" fill="#00CC66" radius={[10, 10, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-border bg-[#0B0B0B] p-6">
                    <div className="text-sm font-semibold text-white">{Math.max(1, hyp.experiment.durationWeeks)}주 실험 계획</div>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div className="rounded-xl border border-border bg-black p-4">
                        <div className="text-xs text-white/45">Problem</div>
                        <div className="mt-2 whitespace-pre-wrap text-white/75">{hyp.problemStatement || "—"}</div>
                      </div>
                      <div className="rounded-xl border border-border bg-black p-4">
                        <div className="text-xs text-white/45">Success criteria</div>
                        <div className="mt-2 whitespace-pre-wrap text-white/75">{hyp.experiment.successCriteria || "—"}</div>
                      </div>
                      <div className="rounded-xl border border-border bg-black p-4">
                        <div className="text-xs text-white/45">Next action</div>
                        <div className="mt-2 whitespace-pre-wrap text-white/75">{hyp.experiment.nextAction || "—"}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-white/40">
                      Disclaimer: 입력 기반 추정치이며, 실행·시장·채널 변화에 따라 달라질 수 있습니다.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="text-xs font-semibold tracking-[0.28em] text-white/50">DETAILS (MATH)</div>
              <div className="mt-3 grid gap-3 text-sm text-white/60 lg:grid-cols-3">
                <div className="rounded-xl border border-border bg-black p-4">
                  <div className="text-xs text-white/45">Entropy</div>
                  <div className="mt-2 font-mono text-white">
                    회수: {formatKrw(Math.round(computed.out.entropy.recoverableMonthlyKrw))}원/월
                  </div>
                  <div className="mt-2 text-xs text-white/45">
                    시스템 부재율: <span className="font-mono text-white">{formatPct01(computed.out.entropy.systemAbsenceRate)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-black p-4">
                  <div className="text-xs text-white/45">Offer</div>
                  <div className="mt-2 font-mono text-white">
                    추가매출: {formatKrw(Math.round(computed.out.offer.monthlyRevenueUpliftKrw))}원/월
                  </div>
                  <div className="mt-2 text-xs text-white/45">
                    객단가/매출 리프트: <span className="font-mono text-white">{formatPct01(computed.out.offer.expectedAovLiftPct)}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-black p-4">
                  <div className="text-xs text-white/45">Pipeline</div>
                  <div className="mt-2 font-mono text-white">
                    합산: {formatKrw(Math.round(computed.out.pipeline.totalMonthlyKrw))}원/월
                  </div>
                  <div className="mt-2 text-xs text-white/45">
                    자동화: <span className="font-mono text-white">{computed.out.pipeline.automationHoursWeekly.toFixed(1)}h/주</span> · 딥워크:{" "}
                    <span className="font-mono text-white">{computed.out.pipeline.deepWorkHoursWeekly.toFixed(1)}h/주</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

