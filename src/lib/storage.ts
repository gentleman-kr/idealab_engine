import type { AppState, Client, SalesStage } from "@/lib/models";
import { uid } from "@/lib/id";
import { defaultFrameworkState } from "@/lib/frameworkDefaults";

const STORAGE_KEY = "idealab_engine_v1";

const emptyState: AppState = {
  clients: [],
  activeClientId: undefined,
};

function safeParse(json: string | null): AppState | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json) as AppState;
    if (!v || typeof v !== "object") return null;
    if (!Array.isArray(v.clients)) return null;
    return v;
  } catch {
    return null;
  }
}

export function loadState(): AppState {
  if (typeof window === "undefined") return emptyState;
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY));
  return parsed ?? emptyState;
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getActiveClient(state: AppState): Client | undefined {
  if (!state.activeClientId) return undefined;
  return state.clients.find((c) => c.id === state.activeClientId);
}

export function createClient(input: {
  name: string;
  email: string;
  businessType: string;
  monthlyRevenueBand: string;
  primaryChannels: string[];
}): Client {
  const framework = defaultFrameworkState();
  return {
    id: uid("client"),
    profile: {
      name: input.name.trim(),
      email: input.email.trim(),
      businessType: input.businessType.trim(),
      monthlyRevenueBand: input.monthlyRevenueBand.trim(),
      primaryChannels: input.primaryChannels.map((s) => s.trim()).filter(Boolean),
    },
    snapshots: [],
    kpis: [],
    framework,
    sales: {
      stage: "diagnostic" satisfies SalesStage,
      lastUpdatedAt: new Date().toISOString(),
      recommendation: undefined,
      note: "",
      trust: {
        credibility: framework.trustEquation.credibility,
        reliability: framework.trustEquation.reliability,
        intimacy: framework.trustEquation.intimacy,
        selfOrientation: framework.trustEquation.selfOrientation,
      },
    },
  };
}

