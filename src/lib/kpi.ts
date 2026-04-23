import type { AiKpi, BrandingKpi, ContentKpi, EnergyKpi, ModuleId, ModuleKpisById } from "@/lib/models";

export function defaultKpiValues(moduleId: ModuleId): ModuleKpisById[ModuleId] {
  switch (moduleId) {
    case "branding":
      return {
        missionClarity: 5,
        scriptComplete: false,
        valueLadderCurrent: 1,
        valueLadderTarget: 3,
        freeToPaidConversionPct: 2,
        ltvKrw: 199_000,
      } satisfies BrandingKpi;
    case "content":
      return {
        weeklyNewsletter: 1,
        weeklyYoutube: 0,
        weeklyReels: 2,
        weeklyThreads: 21,
        weeklyInstagramPosts: 2,
        waterfallPerCore: 8,
        newsletterSubscribers: 0,
        newsletterGrowthPct: 0,
        emailCapturePct: 0,
      } satisfies ContentKpi;
    case "ai":
      return {
        aiDelegationHoursWeekly: 2,
        ceoDirectHoursWeekly: 40,
        automationContentPct: 0,
        costSavingKrwMonthly: 0,
      } satisfies AiKpi;
    case "energy":
      return {
        deepWorkBlocksWeekly: 2,
        entropyChecklistCompletionPct: 0,
        deletedTasksWeekly: 0,
        coreOnePercentFocusHoursDaily: 1,
        burnoutIndex: 5,
      } satisfies EnergyKpi;
  }
}

export function aiDelegationRatePct(ai: AiKpi): number {
  const total = ai.aiDelegationHoursWeekly + ai.ceoDirectHoursWeekly;
  if (total <= 0) return 0;
  return Math.round((ai.aiDelegationHoursWeekly / total) * 1000) / 10;
}

export function contentWeeklyTotal(c: ContentKpi): number {
  return (
    c.weeklyNewsletter +
    c.weeklyYoutube +
    c.weeklyReels +
    c.weeklyThreads +
    c.weeklyInstagramPosts
  );
}

export function brandingScriptScore(b: BrandingKpi): number {
  return b.scriptComplete ? 100 : 0;
}

