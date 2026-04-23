import type { TrendCategory, TrendItem } from "@/lib/models";
import { uid } from "@/lib/id";

export const TREND_FETCH_META_KEY = "idealab_trends_fetch_meta_v1";

export type TrendFetchMeta = {
  lastFetchedAt?: string; // ISO
  lastOkAt?: string; // ISO
  lastError?: string;
};

export type ExternalSource = {
  id: string;
  category: TrendCategory;
  /** Human label shown in UI */
  label: string;
  /** Target URL (RSS). We try direct fetch, then proxies as fallbacks. */
  url: string;
  /** If primary RSS fails or parses empty, try these in order */
  fallbackUrls?: string[];
};

// Curated, public endpoints (no API keys). If a source changes/breaks, swap URL here.
export const EXTERNAL_SOURCES: ExternalSource[] = [
  {
    id: "google_news_kr_creator_economy",
    category: "macro",
    label: "Google News RSS(KR) · 크리에이터 이코노미",
    url: "https://news.google.com/rss/search?q=%ED%81%AC%EB%A6%AC%EC%97%90%EC%9D%B4%ED%84%B0+%EC%9D%B4%EC%BD%94%EB%85%B8%EB%AF%B8&hl=ko&gl=KR&ceid=KR:ko",
    fallbackUrls: [
      "https://news.google.com/rss/search?q=creator+economy&hl=en-US&gl=US&ceid=US:en",
    ],
  },
  {
    id: "google_news_kr_one_person_business",
    category: "macro",
    label: "Google News RSS(KR) · 1인 사업/프리랜서",
    url: "https://news.google.com/rss/search?q=1%EC%9D%B8+%EC%82%AC%EC%97%85+%ED%94%84%EB%A6%AC%EB%9E%9C%EC%84%9C&hl=ko&gl=KR&ceid=KR:ko",
    fallbackUrls: [
      "https://news.google.com/rss/search?q=one+person+business+korea&hl=en-US&gl=US&ceid=US:en",
    ],
  },
  {
    id: "google_news_kr_instagram_algorithm",
    category: "platform",
    label: "Google News RSS(KR) · 인스타 알고리즘",
    url: "https://news.google.com/rss/search?q=%EC%9D%B8%EC%8A%A4%ED%83%80%EA%B7%B8%EB%9E%A8+%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98&hl=ko&gl=KR&ceid=KR:ko",
    fallbackUrls: [
      "https://news.google.com/rss/search?q=Instagram+algorithm&hl=en-US&gl=US&ceid=US:en",
    ],
  },
  {
    id: "google_news_kr_threads_updates",
    category: "platform",
    label: "Google News RSS(KR) · 스레드(Threads) 업데이트",
    url: "https://news.google.com/rss/search?q=Threads+%EC%8A%A4%EB%A0%88%EB%93%9C+%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8&hl=ko&gl=KR&ceid=KR:ko",
    fallbackUrls: [
      "https://news.google.com/rss/search?q=Threads+app+updates&hl=en-US&gl=US&ceid=US:en",
    ],
  },
  {
    id: "google_news_kr_youtube_algorithm",
    category: "platform",
    label: "Google News RSS(KR) · 유튜브 알고리즘",
    url: "https://news.google.com/rss/search?q=%EC%9C%A0%ED%8A%9C%EB%B8%8C+%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98&hl=ko&gl=KR&ceid=KR:ko",
    fallbackUrls: [
      "https://news.google.com/rss/search?q=YouTube+algorithm+changes&hl=en-US&gl=US&ceid=US:en",
    ],
  },
  {
    id: "google_news_kr_ai_tools_creators",
    category: "aiTools",
    label: "Google News RSS(KR) · 크리에이터용 AI 도구",
    url: "https://news.google.com/rss/search?q=%ED%81%AC%EB%A6%AC%EC%97%90%EC%9D%B4%ED%84%B0+AI+%EB%8F%84%EA%B5%AC&hl=ko&gl=KR&ceid=KR:ko",
    fallbackUrls: [
      "https://news.google.com/rss/search?q=generative+AI+tools+for+creators&hl=en-US&gl=US&ceid=US:en",
    ],
  },
  {
    id: "google_news_kr_consulting_pricing",
    category: "competition",
    label: "Google News RSS(KR) · 컨설팅/코칭 시장·가격",
    url: "https://news.google.com/rss/search?q=%EC%BD%94%EC%B9%AD+%EC%BB%A8%EC%84%A4%ED%8C%85+%EA%B0%80%EA%B2%A9&hl=ko&gl=KR&ceid=KR:ko",
    fallbackUrls: [
      "https://news.google.com/rss/search?q=online+coaching+pricing&hl=en-US&gl=US&ceid=US:en",
    ],
  },
];

function jinaProxyUrl(targetUrl: string) {
  return `https://r.jina.ai/${targetUrl}`;
}

function allOriginsProxyUrl(targetUrl: string) {
  // Public CORS proxy. If it changes/breaks, swap endpoint here.
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
}

type FetchAttempt = { kind: "direct" | "jina" | "allorigins"; url: string };

function buildFetchAttempts(targetUrl: string): FetchAttempt[] {
  // Order matters: direct is fastest when CORS allows it.
  return [
    { kind: "direct", url: targetUrl },
    { kind: "jina", url: jinaProxyUrl(targetUrl) },
    { kind: "allorigins", url: allOriginsProxyUrl(targetUrl) },
  ];
}

export function loadFetchMeta(): TrendFetchMeta {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TREND_FETCH_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TrendFetchMeta;
  } catch {
    return {};
  }
}

export function saveFetchMeta(meta: TrendFetchMeta) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TREND_FETCH_META_KEY, JSON.stringify(meta));
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXmlEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractRssItems(markdown: string, limit = 8): Array<{ title: string; link?: string }> {
  // r.jina.ai typically returns markdown-ish text; Google News RSS still contains <item> blocks in many cases.
  const xmlish = markdown.includes("<rss") || markdown.includes("<item") || markdown.includes("<?xml");
  if (!xmlish) {
    // Fallback: pick markdown headings as pseudo-items
    const lines = markdown.split("\n").map((l) => l.trim());
    const titles = lines
      .filter((l) => l.startsWith("#"))
      .map((l) => l.replace(/^#+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, limit);
    return titles.map((t) => ({ title: t }));
  }

  const items: Array<{ title: string; link?: string }> = [];
  const itemBlocks = markdown.split("<item").slice(1);
  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    if (!titleMatch) continue;
    const title = decodeXmlEntities(stripTags(titleMatch[1])).trim();
    const link = linkMatch ? decodeXmlEntities(stripTags(linkMatch[1])).trim() : undefined;
    if (title) items.push({ title, link });
    if (items.length >= limit) break;
  }
  return items;
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n));
}

export function buildSoWhatSummary(input: { category: TrendCategory; title: string; sourceLabel: string }) {
  const t = `${input.title}`.trim();
  const src = input.sourceLabel;

  const platformHints = ["인스타", "instagram", "릴스", "reels", "스레드", "threads", "유튜브", "youtube", "쇼츠", "shorts"];
  const algoHints = ["알고리즘", "algorithm", "노출", "도달", "reach", "engagement", "완주", "retention"];
  const aiHints = ["ai", "gpt", "llm", "생성", "generative", "자동화", "automation", "에이전트", "agent", "툴", "tool"];
  const moneyHints = ["가격", "pricing", "요금", "매출", "수익", "revenue", "ltv", "구독", "subscription"];
  const macroHints = ["시장", "market", "규모", "성장", "growth", "경기", "recession", "금리", "policy", "규제", "regulation"];

  if (input.category === "platform") {
    if (includesAny(t, algoHints) && includesAny(t, platformHints)) {
      return `So what?: (${src}) 플랫폼 알고리즘 변화는 **도달/완주 지표**로 바로 연결됩니다. 이번 주 뉴스레터에 “한 문장 결론 + 지표 1개”를 박아 넣고, 숏폼은 동일 메시지로 A/B 테스트하세요.`;
    }
    return `So what?: (${src}) 채널 변화는 “무엇이 바뀌었는지”보다 **무엇을 바꿔야 하는지**가 핵심입니다. 워터폴의 코어(뉴스레터)에서 메시지를 고정하고 파생 콘텐츠로 확장하세요.`;
  }

  if (input.category === "aiTools") {
    if (includesAny(t, aiHints)) {
      return `So what?: (${src}) AI 도구 확산은 **반복 업무 제거**와 직결됩니다. “대표가 할 일 vs AI가 할 일” 매트릭스를 업데이트하고, 자동화율/위임 시간 KPI를 주간으로 올리세요.`;
    }
    return `So what?: (${src}) AI 이슈는 도입이 아니라 **운영 설계**가 승부처입니다. 워크플로우 1개를 끝까지 자동화해 비용 절감액(월)로 환산해 기록하세요.`;
  }

  if (input.category === "competition") {
    if (includesAny(t, moneyHints)) {
      return `So what?: (${src}) 가격/오퍼 이슈는 **포지셔닝(무엇을 약속할지)**로 흡수됩니다. Value Equation 관점에서 Dream/Likelihood 증거를 3개로 고정하고, Time/Effort를 줄이는 온보딩을 재설계하세요.`;
    }
    return `So what?: (${src}) 경쟁 이슈는 “따라하기”가 아니라 **카테고리 설계**가 답입니다. 1% 시스템의 ‘무료→저가→고가’ 가치 사다리에서 차별화 1줄을 다시 쓰세요.`;
  }

  // macro (default)
  if (includesAny(t, macroHints)) {
    return `So what?: (${src}) 거시/산업 변화는 **수요/단가/채널 비용**에 영향을 줍니다. 이번 분기의 가정(전환율·객단가·리드 비용) 중 1개만 바꿔 시뮬레이션하고, 대시보드에 반영하세요.`;
  }

  return `So what?: (${src}) 외부 이슈는 정보가 아니라 **의사결정 트리거**입니다. “이 뉴스가 내 오퍼/콘텐츠/운영 중 무엇을 바꾸게 하는가?”를 한 줄로 적고, 다음 주 실험 1개로 연결하세요.`;
}

export function mergeTrendItems(existing: TrendItem[], incoming: TrendItem[]): TrendItem[] {
  const seen = new Set(existing.map((t) => normalizeTitle(t.title)));
  const merged = [...existing];
  for (const it of incoming) {
    const key = normalizeTitle(it.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.unshift(it);
  }
  // cap to keep localStorage reasonable
  return merged.slice(0, 200);
}

export async function ingestExternalTrends(existing: TrendItem[]): Promise<{
  next: TrendItem[];
  added: number;
  meta: TrendFetchMeta;
}> {
  const nowIso = new Date().toISOString();
  const meta: TrendFetchMeta = { ...loadFetchMeta(), lastFetchedAt: nowIso };

  const incoming: TrendItem[] = [];
  const errors: string[] = [];

  for (const src of EXTERNAL_SOURCES) {
    try {
      const urls = [src.url, ...(src.fallbackUrls ?? [])];
      let extracted: Array<{ title: string; link?: string }> = [];
      let lastErr: string | undefined;
      let used: { baseUrl: string; attempt: FetchAttempt } | undefined;

      for (const u of urls) {
        const attempts = buildFetchAttempts(u);
        let baseLastErr: string | undefined;

        for (const attempt of attempts) {
          try {
            const res = await fetch(attempt.url, { method: "GET" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            extracted = extractRssItems(text, 8);
            if (extracted.length) {
              used = { baseUrl: u, attempt };
              break;
            }
            baseLastErr = `${attempt.kind}:empty_parse`;
          } catch (e) {
            baseLastErr = `${attempt.kind}:${e instanceof Error ? e.message : String(e)}`;
          }
        }

        if (extracted.length) break;
        lastErr = baseLastErr ?? "no_attempt_succeeded";
      }

      if (!extracted.length) {
        throw new Error(lastErr ? `no_items(${lastErr})` : "no_items");
      }

      for (const x of extracted) {
        incoming.push({
          id: uid("trend"),
          category: src.category,
          title: x.title.slice(0, 140),
          summary: buildSoWhatSummary({ category: src.category, title: x.title, sourceLabel: src.label }),
          source: x.link ?? used?.baseUrl ?? src.url,
          effectiveDate: nowIso,
          createdAt: nowIso,
        });
      }
    } catch (e) {
      errors.push(`${src.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const next = mergeTrendItems(existing, incoming);
  const added = Math.max(0, next.length - existing.length);
  const nextMeta: TrendFetchMeta = {
    ...meta,
    lastOkAt: errors.length === 0 ? nowIso : meta.lastOkAt,
    lastError: errors.length ? errors.slice(0, 3).join(" | ") : undefined,
  };

  return { next, added, meta: nextMeta };
}

export function shouldAutoFetch(ttlMs: number) {
  const meta = loadFetchMeta();
  const last = meta.lastFetchedAt ? Date.parse(meta.lastFetchedAt) : 0;
  if (!last) return true;
  return Date.now() - last > ttlMs;
}
