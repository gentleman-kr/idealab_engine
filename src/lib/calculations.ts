/**
 * 아이디어랩 1% 시스템 — 모듈별 연산
 * 엔트로피(Rumelt) · 가치 방정식(Hormozi) · 자동화 파이프라인 · 거시 트렌드 가중
 */

export type DashboardInputs = {
  /** 월 매출 (원) */
  monthlyRevenueKrw: number;
  /** 주당 평균 업무 시간 */
  weeklyHours: number;
  /** 거시경제·산업 트렌드 (1 역풍 ~ 10 순풍) */
  macroTrend: number;
  /** 아이디어랩 컨설팅 도입 비용 (원) */
  consultingCostKrw: number;
};

const WEEKS_PER_MONTH = 4.33;

/** 거시 트렌드 가중: 5=중립 */
export function macroTrendMultiplier(macroTrend: number): number {
  return 1 + (macroTrend - 5) * 0.038;
}

export type EntropyModuleResult = {
  /** 시스템 부재로 추정되는 업무 시간 낭비 비율 */
  systemAbsenceRate: number;
  /** 인지 부채 (월, 원) */
  cognitiveDebtMonthlyKrw: number;
  /** 시간 손실·기회비용 (월, 원) */
  timeOpportunityMonthlyKrw: number;
  entropyMonthlyKrw: number;
  /** 1% 시스템으로 회수 가능한 월간 가치 */
  recoverableMonthlyKrw: number;
};

/**
 * 엔트로피 진단: 비체계·인지 부채·시간 기회비용
 */
export function computeEntropy(
  input: Pick<DashboardInputs, "monthlyRevenueKrw" | "weeklyHours">,
): EntropyModuleResult {
  const { monthlyRevenueKrw, weeklyHours } = input;
  const monthlyHours = weeklyHours * WEEKS_PER_MONTH;
  const hourlyValue = monthlyRevenueKrw / Math.max(monthlyHours, 1e-6);

  const busynessStress = Math.min(1.25, Math.max(0, (weeklyHours - 36) / 26));
  const systemAbsenceRate = 0.155 + busynessStress * 0.145;

  const lostHoursMonthly = monthlyHours * systemAbsenceRate;
  const totalMonthlyLoss = lostHoursMonthly * hourlyValue;

  const cognitiveShare = 0.57;
  const cognitiveDebtMonthlyKrw = totalMonthlyLoss * cognitiveShare;
  const timeOpportunityMonthlyKrw = totalMonthlyLoss * (1 - cognitiveShare);

  const recoverableMonthlyKrw = totalMonthlyLoss * 0.71;

  return {
    systemAbsenceRate,
    cognitiveDebtMonthlyKrw,
    timeOpportunityMonthlyKrw,
    entropyMonthlyKrw: cognitiveDebtMonthlyKrw + timeOpportunityMonthlyKrw,
    recoverableMonthlyKrw,
  };
}

export type OfferModuleResult = {
  dreamOutcomeLift: number;
  perceivedLikelihoodLift: number;
  frictionReduction: number;
  expectedAovLiftPct: number;
  monthlyRevenueUpliftKrw: number;
};

/**
 * 가치 방정식: Dream×Likelihood / (Time×Effort) 근사 → 객단가·매출 상승
 */
export function computeOffer(
  input: Pick<DashboardInputs, "monthlyRevenueKrw" | "weeklyHours" | "macroTrend">,
): OfferModuleResult {
  const { monthlyRevenueKrw, weeklyHours, macroTrend } = input;

  const dreamOutcomeLift = 0.11 + (macroTrend / 10) * 0.11;
  const perceivedLikelihoodLift = 0.045 + (weeklyHours <= 42 ? 0.028 : 0.012);
  const frictionReduction = 0.085;

  const expectedAovLiftPct = Math.min(
    0.44,
    dreamOutcomeLift + perceivedLikelihoodLift * 0.55 + frictionReduction * 0.38,
  );
  const monthlyRevenueUpliftKrw = monthlyRevenueKrw * expectedAovLiftPct;

  return {
    dreamOutcomeLift,
    perceivedLikelihoodLift,
    frictionReduction,
    expectedAovLiftPct,
    monthlyRevenueUpliftKrw,
  };
}

export type PipelineModuleResult = {
  automationHoursWeekly: number;
  laborSavingsMonthlyKrw: number;
  deepWorkHoursWeekly: number;
  deepWorkValueMonthlyKrw: number;
  totalMonthlyKrw: number;
};

/**
 * 무인 파이프라인: Make/Stibee류 자동화 → 인건비 절감 + 딥워크 가치
 */
export function computePipeline(
  input: Pick<DashboardInputs, "monthlyRevenueKrw" | "weeklyHours">,
): PipelineModuleResult {
  const { monthlyRevenueKrw, weeklyHours } = input;
  const hourlyValue = monthlyRevenueKrw / Math.max(weeklyHours * WEEKS_PER_MONTH, 1e-6);

  const automationHoursWeekly = 5.2 + weeklyHours * 0.112;
  const laborSavingsMonthlyKrw =
    automationHoursWeekly * hourlyValue * WEEKS_PER_MONTH * 0.63;

  const deepWorkHoursWeekly = automationHoursWeekly * 0.36;
  const deepWorkValueMonthlyKrw =
    deepWorkHoursWeekly * hourlyValue * WEEKS_PER_MONTH * 1.38;

  return {
    automationHoursWeekly,
    laborSavingsMonthlyKrw,
    deepWorkHoursWeekly,
    deepWorkValueMonthlyKrw,
    totalMonthlyKrw: laborSavingsMonthlyKrw + deepWorkValueMonthlyKrw,
  };
}

export type ValueConversionResult = {
  monthlyCompositeKrw: number;
  yearlyAdditionalRevenueKrw: number;
  trendMultiplier: number;
  roiMultiple: number;
};

export function computeValueConversion(
  entropy: EntropyModuleResult,
  offer: OfferModuleResult,
  pipeline: PipelineModuleResult,
  macroTrend: number,
  consultingCostKrw: number,
): ValueConversionResult {
  const monthlyCompositeKrw =
    entropy.recoverableMonthlyKrw +
    offer.monthlyRevenueUpliftKrw +
    pipeline.totalMonthlyKrw;

  const trendMultiplier = macroTrendMultiplier(macroTrend);
  const yearlyAdditionalRevenueKrw = monthlyCompositeKrw * 12 * trendMultiplier;

  const roiMultiple =
    consultingCostKrw > 0 ? yearlyAdditionalRevenueKrw / consultingCostKrw : 0;

  return {
    monthlyCompositeKrw,
    yearlyAdditionalRevenueKrw,
    trendMultiplier,
    roiMultiple,
  };
}

export function computeFullDashboard(input: DashboardInputs) {
  const entropy = computeEntropy(input);
  const offer = computeOffer(input);
  const pipeline = computePipeline(input);
  const conversion = computeValueConversion(
    entropy,
    offer,
    pipeline,
    input.macroTrend,
    input.consultingCostKrw,
  );

  return { entropy, offer, pipeline, conversion };
}
