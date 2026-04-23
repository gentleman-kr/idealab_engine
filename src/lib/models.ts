export type ModuleId = "branding" | "content" | "ai" | "energy";

export type ModuleStatus = "danger" | "warning" | "good";

export type EntropyAnswer = "O" | "X";

export type EntropyQuestion = {
  id: string;
  moduleId: ModuleId;
  text: string;
};

export type ClientProfile = {
  name: string;
  email: string;
  businessType: string;
  monthlyRevenueBand: string;
  primaryChannels: string[];
};

export type DiagnosticSnapshot = {
  id: string;
  createdAt: string; // ISO
  entropyAnswers: Record<string, EntropyAnswer>;
  moduleScores: Record<ModuleId, number>; // 0-100
  moduleStatus: Record<ModuleId, ModuleStatus>;
  energyLeakPct: number; // 0-100
};

export type BrandingKpi = {
  missionClarity: number; // 1-10
  scriptComplete: boolean; // 0/100
  valueLadderCurrent: number;
  valueLadderTarget: number;
  freeToPaidConversionPct: number; // 0-100
  ltvKrw: number;
};

export type ContentKpi = {
  weeklyNewsletter: number;
  weeklyYoutube: number;
  weeklyReels: number;
  weeklyThreads: number;
  weeklyInstagramPosts: number;
  waterfallPerCore: number;
  newsletterSubscribers: number;
  newsletterGrowthPct: number; // 0-100
  emailCapturePct: number; // 0-100
};

export type AiKpi = {
  aiDelegationHoursWeekly: number;
  ceoDirectHoursWeekly: number;
  automationContentPct: number; // 0-100
  costSavingKrwMonthly: number;
};

export type EnergyKpi = {
  deepWorkBlocksWeekly: number; // target 5
  entropyChecklistCompletionPct: number; // 0-100
  deletedTasksWeekly: number;
  coreOnePercentFocusHoursDaily: number;
  burnoutIndex: number; // 1-10
};

export type ModuleKpisById = {
  branding: BrandingKpi;
  content: ContentKpi;
  ai: AiKpi;
  energy: EnergyKpi;
};

export type KpiEntry = {
  id: string;
  createdAt: string; // ISO
  moduleId: ModuleId;
  values: ModuleKpisById[ModuleId];
};

export type SalesStage = "diagnostic" | "newsletter" | "call" | "closing" | "won" | "lost";

export type SalesPipeline = {
  stage: SalesStage;
  lastUpdatedAt: string; // ISO
  /** 진단서 완료자 분류용 (옵션) */
  recommendation?: "call" | "system";
  note?: string;
  /** Trusted Advisor: C + R + I / S (1-10 inputs) */
  trust?: {
    credibility: number; // 1-10
    reliability: number; // 1-10
    intimacy: number; // 1-10
    selfOrientation: number; // 1-10 (lower is better, but keep as-is for formula)
  };
};

export type ValueEquationInputs = {
  dreamOutcome: number; // 1-10
  perceivedLikelihood: number; // 1-10
  timeDelay: number; // 1-10 (higher = slower)
  effortSacrifice: number; // 1-10 (higher = harder)
  evidenceUrl?: string;
  note?: string;
};

export type TrustEquationInputs = {
  credibility: number; // 1-10
  reliability: number; // 1-10
  intimacy: number; // 1-10
  selfOrientation: number; // 1-10
  evidenceUrl?: string;
  note?: string;
};

export type FrameworkSnapshot = {
  id: string;
  createdAt: string; // ISO
  valueEquation: ValueEquationInputs;
  trustEquation: TrustEquationInputs;
  valueEquationScore: number; // 0-100
  trustEquationScore: number; // 0-100
};

export type FrameworkState = {
  valueEquation: ValueEquationInputs;
  trustEquation: TrustEquationInputs;
  history: FrameworkSnapshot[];
};

export type Client = {
  id: string;
  profile: ClientProfile;
  /** Baseline(온보딩) 스냅샷 */
  onboardingSnapshotId?: string;
  /** 가장 최근(Current) 스냅샷 */
  currentSnapshotId?: string;
  snapshots: DiagnosticSnapshot[];
  kpis: KpiEntry[];
  sales?: SalesPipeline;
  framework?: FrameworkState;
};

export type TrendCategory = "macro" | "platform" | "aiTools" | "competition";

export type TrendItem = {
  id: string;
  category: TrendCategory;
  title: string;
  summary: string;
  source?: string;
  effectiveDate: string; // ISO
  createdAt: string; // ISO
};

export type AppState = {
  clients: Client[];
  activeClientId?: string;
};
