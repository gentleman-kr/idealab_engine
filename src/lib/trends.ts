import type { TrendItem } from "@/lib/models";
import { uid } from "@/lib/id";

export const TRENDS_STORAGE_KEY = "idealab_trends_v1";

export function defaultTrends(): TrendItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: uid("trend"),
      category: "macro",
      title: "크리에이터 이코노미: 구독·커뮤니티 중심으로 재편",
      summary: "플랫폼 도달이 불안정해질수록 ‘오디언스 소유(이메일/커뮤니티)’가 방어 전략이 됩니다.",
      source: "",
      effectiveDate: now,
      createdAt: now,
    },
    {
      id: uid("trend"),
      category: "platform",
      title: "숏폼: 체류시간·완주율 중심 최적화",
      summary: "릴스/쇼츠는 ‘후킹→완주→저장’ 지표가 핵심. 워터폴 시스템의 피드백 루프에 연결하세요.",
      source: "",
      effectiveDate: now,
      createdAt: now,
    },
    {
      id: uid("trend"),
      category: "aiTools",
      title: "멀티모달 자동화: 콘텐츠 재가공 비용 하락",
      summary: "원문(뉴스레터) → 카드뉴스/스크립트/FAQ 생성 자동화가 표준화되고 있습니다.",
      source: "",
      effectiveDate: now,
      createdAt: now,
    },
    {
      id: uid("trend"),
      category: "competition",
      title: "유사 컨설팅 오퍼: 저가 템플릿 vs 고가 실행코칭 양극화",
      summary: "가격 경쟁 대신 ‘Dream Outcome’과 ‘Likelihood’를 증거로 강화하는 포지셔닝이 중요합니다.",
      source: "",
      effectiveDate: now,
      createdAt: now,
    },
  ];
}

export function loadTrends(): TrendItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(TRENDS_STORAGE_KEY);
  if (!raw) return defaultTrends();
  try {
    const parsed = JSON.parse(raw) as TrendItem[];
    if (!Array.isArray(parsed)) return defaultTrends();
    return parsed;
  } catch {
    return defaultTrends();
  }
}

export function saveTrends(items: TrendItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRENDS_STORAGE_KEY, JSON.stringify(items));
}

