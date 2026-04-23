export const CLOSING_INPUTS_KEY = "closing_inputs_v1";
export const CLOSING_HYPOTHESES_KEY = "closing_hypotheses_v1";

export type ClosingInputs = {
  monthlyRevenueKrw: number;
  weeklyHours: number;
  consultingCostKrw: number;
  macroTrend: number; // 1-10
};

export type ClosingHypothesisState = {
  /** MECE 진단 (Demand/Conversion/Delivery/Energy) */
  mece?: {
    demand: Record<
      string,
      { strength: number; confidence: number; impactKrwMonthly?: number; timeWeeks?: number; effort?: number; note?: string }
    >;
    conversion: Record<
      string,
      { strength: number; confidence: number; impactKrwMonthly?: number; timeWeeks?: number; effort?: number; note?: string }
    >;
    delivery: Record<
      string,
      { strength: number; confidence: number; impactKrwMonthly?: number; timeWeeks?: number; effort?: number; note?: string }
    >;
    energy: Record<
      string,
      { strength: number; confidence: number; impactKrwMonthly?: number; timeWeeks?: number; effort?: number; note?: string }
    >;
  };
  problemStatement: string;
  issueTree: Array<{ id: string; label: string }>;
  hypotheses: Array<{ id: string; issueId?: string; statement: string }>;
  experiment: {
    durationWeeks: number;
    kpi: string;
    successCriteria: string;
    nextAction: string;
  };
};

export function loadClosingInputs(): ClosingInputs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLOSING_INPUTS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ClosingInputs;
  } catch {
    return null;
  }
}

export function saveClosingInputs(inputs: ClosingInputs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLOSING_INPUTS_KEY, JSON.stringify(inputs));
}

export function loadClosingHypotheses(): ClosingHypothesisState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLOSING_HYPOTHESES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClosingHypothesisState;
    return parsed;
  } catch {
    return null;
  }
}

export function saveClosingHypotheses(state: ClosingHypothesisState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLOSING_HYPOTHESES_KEY, JSON.stringify(state));
}

