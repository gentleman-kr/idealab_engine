import type {
  DiagnosticSnapshot,
  EntropyAnswer,
  EntropyQuestion,
  ModuleId,
  ModuleStatus,
} from "@/lib/models";
import { uid } from "@/lib/id";

export const ENTROPY_QUESTIONS: EntropyQuestion[] = [
  { id: "q1", moduleId: "branding", text: "사명을 한 문장으로 말할 수 없다" },
  { id: "q2", moduleId: "branding", text: "고객에게 매번 다른 말을 한다" },
  { id: "q3", moduleId: "branding", text: "무료 → 유료 연결 흐름이 없다" },

  { id: "q4", moduleId: "content", text: "채널마다 따로 콘텐츠를 만든다" },
  { id: "q5", moduleId: "content", text: "반응 데이터를 보지 않는다" },
  { id: "q6", moduleId: "content", text: "이메일 구독자 수집 구조가 없다" },

  { id: "q7", moduleId: "ai", text: "이미지를 매번 직접 만든다" },
  { id: "q8", moduleId: "ai", text: "아이디어 생성에 매주 1시간 이상 쓴다" },
  { id: "q9", moduleId: "ai", text: "내 일과 AI 일이 구분되지 않는다" },

  { id: "q10", moduleId: "energy", text: "뭐부터 해야 할지 매번 고민한다" },
  { id: "q11", moduleId: "energy", text: "90분 집중 시간이 없다" },
  { id: "q12", moduleId: "energy", text: "매주 업무 정리 루틴이 없다" },
];

export type DiagnosticInput = {
  entropyAnswers: Record<string, EntropyAnswer>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeEnergyLeakPct(answers: Record<string, EntropyAnswer>): number {
  const total = ENTROPY_QUESTIONS.length;
  const oCount = ENTROPY_QUESTIONS.reduce((acc, q) => acc + (answers[q.id] === "O" ? 1 : 0), 0);
  return clamp(Math.round((oCount / total) * 100), 0, 100);
}

export function computeModuleScore(
  moduleId: ModuleId,
  answers: Record<string, EntropyAnswer>,
): number {
  const qs = ENTROPY_QUESTIONS.filter((q) => q.moduleId === moduleId);
  if (qs.length === 0) return 0;
  const o = qs.reduce((acc, q) => acc + (answers[q.id] === "O" ? 1 : 0), 0);
  // O는 "문제 있음"이므로 점수는 역산
  const score = 100 - (o / qs.length) * 100;
  return clamp(Math.round(score), 0, 100);
}

export function computeModuleStatus(score: number): ModuleStatus {
  if (score < 50) return "danger";
  if (score < 80) return "warning";
  return "good";
}

export function buildSnapshot(input: DiagnosticInput): DiagnosticSnapshot {
  const moduleScores = {
    branding: computeModuleScore("branding", input.entropyAnswers),
    content: computeModuleScore("content", input.entropyAnswers),
    ai: computeModuleScore("ai", input.entropyAnswers),
    energy: computeModuleScore("energy", input.entropyAnswers),
  } as const;

  const moduleStatus = {
    branding: computeModuleStatus(moduleScores.branding),
    content: computeModuleStatus(moduleScores.content),
    ai: computeModuleStatus(moduleScores.ai),
    energy: computeModuleStatus(moduleScores.energy),
  } as const;

  return {
    id: uid("snap"),
    createdAt: new Date().toISOString(),
    entropyAnswers: input.entropyAnswers,
    moduleScores: { ...moduleScores },
    moduleStatus: { ...moduleStatus },
    energyLeakPct: computeEnergyLeakPct(input.entropyAnswers),
  };
}

