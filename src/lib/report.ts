import type { Client, ModuleId } from "@/lib/models";
import { kernelRecommendation, trustEquationScore, valueEquationScore } from "@/lib/frameworkScores";

const moduleLabels: Record<ModuleId, string> = {
  branding: "브랜딩",
  content: "콘텐츠 워터폴",
  ai: "AI 시스템",
  energy: "에너지 시스템",
};

export function getBaseline(client: Client) {
  if (!client.onboardingSnapshotId) return undefined;
  return client.snapshots.find((s) => s.id === client.onboardingSnapshotId);
}

export function getCurrent(client: Client) {
  if (!client.currentSnapshotId) return undefined;
  return client.snapshots.find((s) => s.id === client.currentSnapshotId);
}

export function buildReportLines(client: Client): string[] {
  const baseline = getBaseline(client);
  const current = getCurrent(client) ?? baseline;

  const lines: string[] = [];
  lines.push("IDEALAB · Less is More");
  lines.push("Client Report (Baseline → Current)");
  lines.push("");
  lines.push(`Name: ${client.profile.name}`);
  lines.push(`Email: ${client.profile.email}`);
  lines.push(`Business: ${client.profile.businessType}`);
  lines.push(`Revenue band: ${client.profile.monthlyRevenueBand}`);
  lines.push(`Channels: ${client.profile.primaryChannels.join(", ") || "-"}`);
  lines.push("");

  if (!baseline) {
    lines.push("No baseline snapshot found. Please complete onboarding first.");
    return lines;
  }

  const kernel = kernelRecommendation(client);
  const vEq = valueEquationScore(client);
  const tEq = trustEquationScore(client);

  lines.push("Executive summary:");
  lines.push(`- Kernel focus: ${kernel ? `${kernel.label} (${kernel.reason})` : "-"}`);
  lines.push(`- Value Equation score: ${vEq ?? "-"}`);
  lines.push(`- Trust Equation score: ${tEq ?? "-"}`);
  lines.push("");

  if (client.framework) {
    const v = client.framework.valueEquation;
    const t = client.framework.trustEquation;
    lines.push("Framework inputs (current):");
    lines.push(
      `- Value Equation: Dream ${v.dreamOutcome}/10, Likelihood ${v.perceivedLikelihood}/10, TimeDelay ${v.timeDelay}/10, Effort ${v.effortSacrifice}/10`,
    );
    lines.push(`  - Evidence: ${v.evidenceUrl?.trim() ? v.evidenceUrl.trim() : "-"}`);
    lines.push(`  - Note: ${v.note?.trim() ? v.note.trim() : "-"}`);
    lines.push(
      `- Trust Equation: C ${t.credibility}/10, R ${t.reliability}/10, I ${t.intimacy}/10, S ${t.selfOrientation}/10`,
    );
    lines.push(`  - Evidence: ${t.evidenceUrl?.trim() ? t.evidenceUrl.trim() : "-"}`);
    lines.push(`  - Note: ${t.note?.trim() ? t.note.trim() : "-"}`);
    lines.push("");

    const hist = client.framework.history.slice(0, 5);
    if (hist.length) {
      lines.push("Framework history (latest 5):");
      for (const h of hist) {
        lines.push(
          `- ${new Date(h.createdAt).toLocaleString("ko-KR")}: Value ${h.valueEquationScore}, Trust ${h.trustEquationScore}`,
        );
      }
      lines.push("");
    }
  }

  lines.push(`Baseline date: ${new Date(baseline.createdAt).toLocaleString("ko-KR")}`);
  lines.push(`Current date: ${current ? new Date(current.createdAt).toLocaleString("ko-KR") : "-"}`);
  lines.push(`Energy leakage: ${baseline.energyLeakPct}% → ${current?.energyLeakPct ?? baseline.energyLeakPct}%`);
  lines.push("");

  const ids: ModuleId[] = ["branding", "content", "ai", "energy"];
  lines.push("Module scores (0-100):");
  for (const id of ids) {
    const b = baseline.moduleScores[id];
    const a = current?.moduleScores[id] ?? b;
    lines.push(`- ${moduleLabels[id]}: ${b} → ${a} (${baseline.moduleStatus[id]} → ${(current ?? baseline).moduleStatus[id]})`);
  }

  lines.push("");
  lines.push("Latest KPI entries (if any):");
  for (const id of ids) {
    const entry = client.kpis.find((k) => k.moduleId === id);
    lines.push(`- ${moduleLabels[id]}: ${entry ? new Date(entry.createdAt).toLocaleString("ko-KR") : "-"}`);
  }

  lines.push("");
  if (client.sales) {
    lines.push("Sales pipeline:");
    lines.push(`- Stage: ${client.sales.stage}`);
    if (client.sales.recommendation) lines.push(`- Recommendation: ${client.sales.recommendation}`);
    if (client.sales.note) lines.push(`- Note: ${client.sales.note}`);
  }

  return lines;
}

