import type { FrameworkState, TrustEquationInputs, ValueEquationInputs } from "@/lib/models";

export function defaultValueEquationInputs(): ValueEquationInputs {
  return {
    dreamOutcome: 6,
    perceivedLikelihood: 6,
    timeDelay: 6,
    effortSacrifice: 6,
    evidenceUrl: "",
    note: "",
  };
}

export function defaultTrustEquationInputs(): TrustEquationInputs {
  return {
    credibility: 6,
    reliability: 6,
    intimacy: 6,
    selfOrientation: 4,
    evidenceUrl: "",
    note: "",
  };
}

export function defaultFrameworkState(): FrameworkState {
  return {
    valueEquation: defaultValueEquationInputs(),
    trustEquation: defaultTrustEquationInputs(),
    history: [],
  };
}
