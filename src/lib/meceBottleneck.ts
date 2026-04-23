export type MeceBucket = "demand" | "conversion" | "delivery" | "energy";

export type DriverId =
  // demand
  | "positioning"
  | "channelFit"
  | "leadQuality"
  // conversion
  | "offerStrength"
  | "trustProof"
  | "salesFriction"
  // delivery
  | "deliveryQuality"
  | "automation"
  | "retention"
  // energy
  | "focusTime"
  | "decisionFatigue"
  | "weeklyReview";

export type DriverInput = {
  /** 1-10 (10 = very strong / healthy) */
  strength: number;
  /** 0-1 (evidence quality) */
  confidence: number;
  /** Estimated monthly impact if fixed (KRW) */
  impactKrwMonthly: number;
  /** Expected time-to-effect (weeks) */
  timeWeeks: number;
  /** Execution effort (1 easy ~ 5 hard) */
  effort: number;
  /** Optional note/evidence */
  note?: string;
};

export type MeceDiagnosis = {
  demand: Record<"positioning" | "channelFit" | "leadQuality", DriverInput>;
  conversion: Record<"offerStrength" | "trustProof" | "salesFriction", DriverInput>;
  delivery: Record<"deliveryQuality" | "automation" | "retention", DriverInput>;
  energy: Record<"focusTime" | "decisionFatigue" | "weeklyReview", DriverInput>;
};

export type DriverScore = {
  bucket: MeceBucket;
  id: DriverId;
  label: string;
  weakness: number; // 0-1
  confidence: number; // 0-1
  impactKrwMonthly: number;
  timeWeeks: number;
  effort: number;
  priority: number; // arbitrary units
  playbook: "branding" | "content" | "ai" | "energy";
  recommendation: string; // short action
  kpi: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function weaknessFromStrength(strength: number) {
  // strength 10 -> weakness 0, strength 1 -> weakness ~1
  const s = clamp(strength, 1, 10);
  return clamp((10 - s) / 9, 0, 1);
}

// Playbook mapping: how we solve it (Less is More levers)
const DRIVER_META: Record<
  DriverId,
  Omit<DriverScore, "weakness" | "confidence" | "priority" | "impactKrwMonthly" | "timeWeeks" | "effort">
> = {
  // Demand
  positioning: {
    bucket: "demand",
    id: "positioning",
    label: "포지셔닝/타겟 선명도",
    playbook: "branding",
    recommendation: "타겟 1문장 + ‘No’ 리스트를 확정하고, 메시지 1줄을 전 채널에 고정하세요.",
    kpi: "상담 신청률(%) 또는 프로필→링크 클릭률(%)",
  },
  channelFit: {
    bucket: "demand",
    id: "channelFit",
    label: "채널-오퍼 적합도",
    playbook: "content",
    recommendation: "코어 채널 1개를 정하고, 동일 오퍼/CTA로 2주간 일관된 실험을 하세요.",
    kpi: "리드당 비용(CPL) 또는 리드당 매출(RPL)",
  },
  leadQuality: {
    bucket: "demand",
    id: "leadQuality",
    label: "리드 품질",
    playbook: "content",
    recommendation: "리드 자격요건(필터 질문 3개)과 케이스/증거를 상단에 배치해 ‘적합 리드’만 모으세요.",
    kpi: "적합 리드 비중(%) 또는 상담 전환율(%)",
  },
  // Conversion
  offerStrength: {
    bucket: "conversion",
    id: "offerStrength",
    label: "오퍼(가치 방정식)",
    playbook: "branding",
    recommendation: "오퍼 1pager(결론 1줄 + 증거 3개 + 보장/리스크 제거 1개)로 전환 마찰을 낮추세요.",
    kpi: "무료→유료 전환율(%) 또는 결제 전환율(%)",
  },
  trustProof: {
    bucket: "conversion",
    id: "trustProof",
    label: "신뢰/증거(Proof)",
    playbook: "branding",
    recommendation: "Before/After, 수치, 후기, 사례를 1페이지로 정리해 세일즈 스토리의 근거로 쓰세요.",
    kpi: "상담→클로징 전환율(%)",
  },
  salesFriction: {
    bucket: "conversion",
    id: "salesFriction",
    label: "세일즈 마찰(프로세스)",
    playbook: "content",
    recommendation: "단계(진단→요약→제안→결제)마다 ‘다음 행동’ 1개만 남기고, 불필요한 선택지를 제거하세요.",
    kpi: "리드→상담 예약률(%)",
  },
  // Delivery
  deliveryQuality: {
    bucket: "delivery",
    id: "deliveryQuality",
    label: "전달 품질/납기",
    playbook: "energy",
    recommendation: "서비스 전달을 체크리스트/템플릿으로 표준화해 리드타임을 줄이세요.",
    kpi: "납기 준수율(%) 또는 NPS(점)",
  },
  automation: {
    bucket: "delivery",
    id: "automation",
    label: "자동화/반복 제거",
    playbook: "ai",
    recommendation: "반복 업무 1개를 끝까지 자동화하고, 주당 회수시간(h)을 KPI로 잡으세요.",
    kpi: "주당 회수시간(h) 또는 자동화율(%)",
  },
  retention: {
    bucket: "delivery",
    id: "retention",
    label: "리텐션/재구매",
    playbook: "content",
    recommendation: "고객 성공(성공조건/리듬)을 정의하고, 온보딩+리마인드 메시지를 고정하세요.",
    kpi: "재구매율(%) 또는 30일 유지율(%)",
  },
  // Energy
  focusTime: {
    bucket: "energy",
    id: "focusTime",
    label: "집중시간(딥워크)",
    playbook: "energy",
    recommendation: "주 5회 딥워크 블록을 먼저 확보하고, 그 시간에 ‘Kernel 1개’만 진행하세요.",
    kpi: "주간 딥워크 블록 수(회)",
  },
  decisionFatigue: {
    bucket: "energy",
    id: "decisionFatigue",
    label: "의사결정 피로/잡무",
    playbook: "energy",
    recommendation: "반복 의사결정을 규칙/템플릿으로 고정하고, 삭제 리스트를 매주 10개 유지하세요.",
    kpi: "주간 삭제 업무 수(개)",
  },
  weeklyReview: {
    bucket: "energy",
    id: "weeklyReview",
    label: "주간 리뷰 시스템",
    playbook: "energy",
    recommendation: "매주 30분 리뷰(성과/학습/다음 1%)를 캘린더에 고정하고 절대 미루지 마세요.",
    kpi: "주간 리뷰 완료율(%)",
  },
};

export function defaultMeceDiagnosis(): MeceDiagnosis {
  const base = { strength: 6, confidence: 0.6, impactKrwMonthly: 2_000_000, timeWeeks: 2, effort: 3, note: "" };
  return {
    demand: { positioning: base, channelFit: base, leadQuality: base },
    conversion: { offerStrength: base, trustProof: base, salesFriction: base },
    delivery: { deliveryQuality: base, automation: base, retention: base },
    energy: { focusTime: base, decisionFatigue: base, weeklyReview: base },
  };
}

export function scoreDrivers(diag: MeceDiagnosis): DriverScore[] {
  const entries: Array<[DriverId, DriverInput]> = [
    ["positioning", diag.demand.positioning],
    ["channelFit", diag.demand.channelFit],
    ["leadQuality", diag.demand.leadQuality],
    ["offerStrength", diag.conversion.offerStrength],
    ["trustProof", diag.conversion.trustProof],
    ["salesFriction", diag.conversion.salesFriction],
    ["deliveryQuality", diag.delivery.deliveryQuality],
    ["automation", diag.delivery.automation],
    ["retention", diag.delivery.retention],
    ["focusTime", diag.energy.focusTime],
    ["decisionFatigue", diag.energy.decisionFatigue],
    ["weeklyReview", diag.energy.weeklyReview],
  ];

  return entries.map(([id, v]) => {
    const meta = DRIVER_META[id];
    const weakness = weaknessFromStrength(v.strength);
    const confidence = clamp(v.confidence, 0.2, 0.95);
    const impactKrwMonthly = Math.max(0, Number.isFinite(v.impactKrwMonthly) ? v.impactKrwMonthly : 0);
    const timeWeeks = clamp(Number.isFinite(v.timeWeeks) ? v.timeWeeks : 2, 1, 12);
    const effort = clamp(Number.isFinite(v.effort) ? v.effort : 3, 1, 5);

    // Priority: (Impact * Weakness * Confidence) / (Time * Effort)
    const priority = (impactKrwMonthly * weakness * confidence) / (timeWeeks * effort);
    return { ...meta, weakness, confidence, impactKrwMonthly, timeWeeks, effort, priority };
  });
}

export function pickBottleneck(diag: MeceDiagnosis): DriverScore {
  const scored = scoreDrivers(diag);
  // Choose highest priority (worst+most certain)
  return scored.sort((a, b) => b.priority - a.priority)[0]!;
}

