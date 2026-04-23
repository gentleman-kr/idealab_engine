import type { Client, ModuleId, TrustEquationInputs, ValueEquationInputs } from "@/lib/models";

const moduleLabels: Record<ModuleId, string> = {
  branding: "브랜딩",
  content: "콘텐츠 워터폴",
  ai: "AI 시스템",
  energy: "에너지 시스템",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function kernelRecommendation(client: Client): { moduleId: ModuleId; label: string; reason: string } | null {
  const baseId = client.onboardingSnapshotId;
  if (!baseId) return null;
  const baseline = client.snapshots.find((s) => s.id === baseId);
  if (!baseline) return null;
  const ids: ModuleId[] = ["branding", "content", "ai", "energy"];
  let pick: ModuleId = "branding";
  let min = baseline.moduleScores[pick];
  for (const id of ids) {
    const score = baseline.moduleScores[id];
    if (score < min) {
      min = score;
      pick = id;
    }
  }
  const reason = `Baseline 기준 최저 점수(${min}점) 모듈입니다.`;
  return { moduleId: pick, label: moduleLabels[pick], reason };
}

export function computeValueEquationScoreFromInputs(v: ValueEquationInputs): number {
  const dream = clamp(Number(v.dreamOutcome), 1, 10);
  const likelihood = clamp(Number(v.perceivedLikelihood), 1, 10);
  const timeDelay = clamp(Number(v.timeDelay), 1, 10);
  const effort = clamp(Number(v.effortSacrifice), 1, 10);

  const raw = (dream * likelihood) / (timeDelay * effort); // ~0.01..100
  // map raw 0.25..6.25 to 0..100 (typical range)
  const score = ((raw - 0.25) / (6.25 - 0.25)) * 100;
  return clamp(Math.round(score), 0, 100);
}

export function computeTrustEquationScoreFromInputs(t: TrustEquationInputs): number {
  const c = clamp(Number(t.credibility), 1, 10);
  const r = clamp(Number(t.reliability), 1, 10);
  const i = clamp(Number(t.intimacy), 1, 10);
  const s = clamp(Number(t.selfOrientation), 1, 10);
  const raw = (c + r + i) / s;
  const score = ((raw - 0.5) / (5.0 - 0.5)) * 100;
  return clamp(Math.round(score), 0, 100);
}

export function valueEquationScore(client: Client): number | null {
  if (client.framework?.valueEquation) {
    return computeValueEquationScoreFromInputs(client.framework.valueEquation);
  }

  // Fallback: KPI proxy (legacy)
  const latest = (id: ModuleId) => client.kpis.find((k) => k.moduleId === id);
  const b = latest("branding")?.values as any;
  const c = latest("content")?.values as any;
  const a = latest("ai")?.values as any;
  const e = latest("energy")?.values as any;
  if (!b || !c || !a || !e) return null;

  const dream = clamp((Number(b.missionClarity) / 10) * 0.6 + (b.scriptComplete ? 0.4 : 0.1), 0.05, 1.0);
  const likelihood = clamp((Number(a.automationContentPct) / 100) * 0.4 + (Number(c.newsletterGrowthPct) / 100) * 0.2 + 0.4, 0.05, 1.2);
  const timeDelay = clamp(1.2 - Number(c.weeklyNewsletter) * 0.15, 0.4, 1.6);
  const effort = clamp((Number(e.burnoutIndex) / 10) * 1.2 + (5 - Number(e.deepWorkBlocksWeekly)) * 0.08, 0.4, 1.8);

  const raw = (dream * likelihood) / (timeDelay * effort);
  const score = ((raw - 0.2) / (1.2 - 0.2)) * 100;
  return clamp(Math.round(score), 0, 100);
}

export function trustEquationScore(client: Client): number | null {
  if (client.framework?.trustEquation) {
    return computeTrustEquationScoreFromInputs(client.framework.trustEquation);
  }

  const t = client.sales?.trust;
  if (!t) return null;
  return computeTrustEquationScoreFromInputs({
    credibility: t.credibility,
    reliability: t.reliability,
    intimacy: t.intimacy,
    selfOrientation: t.selfOrientation,
  });
}
