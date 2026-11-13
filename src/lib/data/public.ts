import "server-only";
import { cache } from "react";
import { isDemo } from "@/lib/env";
import { supabasePublic } from "@/lib/supabase/server";
import { DEMO_ARTICLES, DEMO_SERIES, findDemo } from "@/content/demo";
import { TEAM } from "@/content/team";
import type { Article, Discipline, Series } from "@/types/database";

// 공개 데이터 조회 (anon + RLS)
export type Byline = { handle: string; name: string; discipline: Discipline | null; role?: string | null };
export type ArticleCard = Pick<
  Article,
  "id" | "slug" | "title" | "subtitle" | "excerpt" | "discipline" | "tags" | "published_at" | "peer_reviewed" | "updated_at" | "cover_url" | "view_count" | "like_count" | "popularity" | "style" | "title_en" | "series_id" | "series_no"
> & { author: Byline; series?: SeriesTag | null };
// 카드 · 본문에 붙는 연재 표시
export type SeriesTag = Pick<Series, "id" | "slug" | "title" | "title_en" | "kind">;
export type Episode = { slug: string; title: string; title_en: string | null; no: number | null };
export type ArticleFull = Article & {
  author: Byline;
  series: (SeriesTag & { prev: Episode | null; next: Episode | null; total: number }) | null;
  coauthors: (Byline & { contribution: string | null })[];
  reviewers: (Byline & { reviewed_at: string | null })[];
};

const teamByline = (handle: string): Byline => {
  const m = TEAM.find((t) => t.handle === handle);
  return { handle, name: m?.name ?? handle, discipline: m?.discipline ?? null, role: m?.role };
};

const CARD_COLS = "id, slug, title, subtitle, excerpt, discipline, tags, published_at, peer_reviewed, updated_at, cover_url, view_count, like_count, popularity, style, title_en, series_id, series_no, author_id";

async function bylines(ids: string[]): Promise<Map<string, Byline>> {
  if (!ids.length) return new Map();
  const { data } = await supabasePublic()
    .from("profiles")
    .select("id, handle, display_name, discipline, role_title")
    .in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p) => [p.id, { handle: p.handle, name: p.display_name, discipline: p.discipline, role: p.role_title }]));
}

export const listPublicArticles = cache(async (opts: { limit?: number; discipline?: Discipline } = {}): Promise<ArticleCard[]> => {
  const limit = opts.limit ?? 24;
  if (isDemo) {
    return DEMO_ARTICLES.filter((a) => !opts.discipline || a.discipline === opts.discipline)
      .slice(0, limit)
      .map((a) => ({ ...a, author: teamByline(a.authorHandle), series: demoTag(a.series_id) }));
  }
  let q = supabasePublic().from("articles").select(CARD_COLS).eq("is_public", true).order("published_at", { ascending: false }).limit(limit);
  if (opts.discipline) q = q.eq("discipline", opts.discipline);
  const { data, error } = await q;
  if (error) throw error;
  const [by, tags] = await Promise.all([bylines((data ?? []).map((a) => a.author_id)), seriesTags((data ?? []).map((a) => a.series_id))]);
  return (data ?? []).map(({ author_id, ...a }) => ({
    ...a,
    author: by.get(author_id) ?? { handle: "unknown", name: "Unknown", discipline: null },
    series: a.series_id ? tags.get(a.series_id) ?? null : null,
  }));
});

const TAG_COLS = "id, slug, title, title_en, kind";
const demoTag = (id: string | null): SeriesTag | null => {
  const s = id ? DEMO_SERIES.find((x) => x.id === id) : null;
  return s ? { id: s.id, slug: s.slug, title: s.title, title_en: s.title_en, kind: s.kind } : null;
};
async function seriesTags(ids: (string | null)[]): Promise<Map<string, SeriesTag>> {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  if (!uniq.length) return new Map();
  const { data } = await supabasePublic().from("series").select(TAG_COLS).in("id", uniq);
  return new Map((data ?? []).map((s) => [s.id, s]));
}

// 회차 순서: 번호 → 발행일
const byEpisode = (a: { series_no: number | null; published_at: string | null }, b: { series_no: number | null; published_at: string | null }) =>
  (a.series_no ?? 9999) - (b.series_no ?? 9999) || String(a.published_at).localeCompare(String(b.published_at));

export type SeriesSummary = Series & { episodes: ArticleCard[]; latest: string | null };

// 웹진 연재 서가: 공개 회차가 있는 시리즈
export const listPublicSeries = cache(async (): Promise<SeriesSummary[]> => {
  const all = await listPublicArticles({ limit: 400 });
  const groups = new Map<string, ArticleCard[]>();
  for (const a of all) if (a.series_id) groups.set(a.series_id, [...(groups.get(a.series_id) ?? []), a]);
  if (!groups.size) return [];
  let rows: Series[];
  if (isDemo) rows = DEMO_SERIES.filter((s) => groups.has(s.id));
  else {
    const { data } = await supabasePublic().from("series").select("*").in("id", [...groups.keys()]);
    rows = data ?? [];
  }
  return rows
    .map((s) => {
      const episodes = (groups.get(s.id) ?? []).sort(byEpisode);
      const latest = episodes.map((e) => e.published_at).filter(Boolean).sort().at(-1) ?? null;
      return { ...s, episodes, latest };
    })
    .sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0) || String(b.latest).localeCompare(String(a.latest)));
});

export const getPublicSeries = cache(async (slug: string): Promise<SeriesSummary | null> => {
  const list = await listPublicSeries();
  return list.find((s) => s.slug === slug) ?? null;
});

// 본문용: 같은 시리즈 앞뒤 회차
async function seriesContext(a: Pick<Article, "id" | "series_id">): Promise<ArticleFull["series"]> {
  if (!a.series_id) return null;
  const s = (await listPublicSeries()).find((x) => x.id === a.series_id);
  if (!s) return null;
  const i = s.episodes.findIndex((e) => e.id === a.id);
  const ep = (e?: ArticleCard): Episode | null => (e ? { slug: e.slug, title: e.title, title_en: e.title_en, no: e.series_no } : null);
  return { id: s.id, slug: s.slug, title: s.title, title_en: s.title_en, kind: s.kind, prev: ep(s.episodes[i - 1]), next: i >= 0 ? ep(s.episodes[i + 1]) : null, total: s.episodes.length };
}

export const getPublicArticle = cache(async (slug: string): Promise<ArticleFull | null> => {
  if (isDemo) {
    const a = findDemo(slug);
    if (!a) return null;
    const { authorHandle, coauthors, reviewers, ...rest } = a;
    return {
      ...rest,
      series: await seriesContext(rest),
      author: teamByline(authorHandle),
      coauthors: coauthors.map((c) => ({ ...teamByline(c.handle), contribution: c.contribution })),
      reviewers: reviewers.map((h) => ({ ...teamByline(h), reviewed_at: a.updated_at })),
    };
  }
  const sb = supabasePublic();
  const { data: a } = await sb.from("articles").select("*").eq("slug", slug).eq("is_public", true).maybeSingle();
  if (!a) return null;

  const [{ data: co }, { data: rv }] = await Promise.all([
    sb.from("article_authors").select("profile_id, contribution").eq("article_id", a.id),
    sb.rpc("public_reviewers", { a: a.id }),
  ]);
  const [by, series] = await Promise.all([bylines([a.author_id, ...(co ?? []).map((c) => c.profile_id)]), seriesContext(a)]);

  return {
    ...a,
    series,
    author: by.get(a.author_id) ?? { handle: "unknown", name: "Unknown", discipline: null },
    coauthors: (co ?? []).flatMap((c) => {
      const b = by.get(c.profile_id);
      return b ? [{ ...b, contribution: c.contribution }] : [];
    }),
    reviewers: (rv ?? []).map((r) => ({ handle: r.handle, name: r.display_name, discipline: r.discipline, reviewed_at: r.reviewed_at })),
  };
});

export type AuthorPage = {
  byline: Byline;
  bio: string | null;
  contact?: string | null; // 연락 메일 (선택)
  stats: { articles: number; coauthored: number; reviews: number; annotations: number; debate_comments: number };
  articles: ArticleCard[];
  coauthored: (ArticleCard & { contribution: string | null })[];
  pins: ArticleCard[];
};

export const getAuthor = cache(async (handle: string): Promise<AuthorPage | null> => {
  if (isDemo) {
    const m = TEAM.find((t) => t.handle === handle);
    if (!m) return null;
    const own = DEMO_ARTICLES.filter((a) => a.authorHandle === handle);
    const co = DEMO_ARTICLES.filter((a) => a.coauthors.some((c) => c.handle === handle));
    const card = (a: (typeof DEMO_ARTICLES)[number]) => ({ ...a, author: teamByline(a.authorHandle) });
    return {
      byline: teamByline(handle),
      bio: m.bio || null,
      stats: { articles: own.length, coauthored: co.length, reviews: DEMO_ARTICLES.length, annotations: 0, debate_comments: 0 },
      articles: own.map(card),
      coauthored: co.map((a) => ({ ...card(a), contribution: a.coauthors.find((c) => c.handle === handle)?.contribution ?? null })),
      pins: [],
    };
  }
  const sb = supabasePublic();
  const team = TEAM.find((t) => t.handle === handle);
  let { data: p } = await sb.from("profiles").select("*").eq("handle", handle).eq("is_member", true).maybeSingle();
  // 고정 링크 → 전공 기준 멤버 매칭
  if (!p && team) {
    ({ data: p } = await sb.from("profiles").select("*").eq("discipline", team.discipline).eq("is_member", true).limit(1).maybeSingle());
  }
  // 미가입 멤버: 팀 기본 정보
  if (!p) {
    if (!team) return null;
    return {
      byline: teamByline(handle),
      bio: team.bio || null,
      stats: { articles: 0, coauthored: 0, reviews: 0, annotations: 0, debate_comments: 0 },
      articles: [],
      coauthored: [],
      pins: [],
    };
  }
  const base = team ?? TEAM.find((t) => t.discipline === p.discipline);

  const [{ data: stats }, { data: own }, { data: links }, { data: pinRows }] = await Promise.all([
    sb.rpc("public_contributions", { h: p.handle }),
    sb.from("articles").select(CARD_COLS).eq("author_id", p.id).eq("is_public", true).order("published_at", { ascending: false }),
    sb.from("article_authors").select("article_id, contribution").eq("profile_id", p.id),
    sb.from("profile_pins").select("article_id, position").eq("profile_id", p.id).order("position"),
  ]);
  const pinIds = (pinRows ?? []).map((r) => r.article_id);
  const { data: pinArts } = pinIds.length
    ? await sb.from("articles").select(CARD_COLS).in("id", pinIds).eq("is_public", true).eq("peer_reviewed", true)
    : { data: [] as NonNullable<typeof own> };
  const coIds = (links ?? []).map((l) => l.article_id);
  const { data: coRows } = coIds.length
    ? await sb.from("articles").select(CARD_COLS).in("id", coIds).eq("is_public", true)
    : { data: [] as NonNullable<typeof own> };
  const by = await bylines([...(own ?? []), ...(coRows ?? []), ...(pinArts ?? [])].map((a) => a.author_id));
  const toCard = ({ author_id, ...a }: NonNullable<typeof own>[number]): ArticleCard => ({
    ...a,
    author: by.get(author_id) ?? { handle: p.handle, name: p.display_name, discipline: p.discipline },
  });

  return {
    byline: { handle: p.handle, name: p.display_name, discipline: p.discipline, role: p.role_title || base?.role },
    bio: p.bio || base?.bio || null,
    contact: p.contact_email ?? null,
    stats: stats?.[0] ?? { articles: 0, coauthored: 0, reviews: 0, annotations: 0, debate_comments: 0 },
    articles: (own ?? []).map(toCard),
    coauthored: (coRows ?? []).map((a) => ({ ...toCard(a), contribution: links?.find((l) => l.article_id === a.id)?.contribution ?? null })),
    pins: pinIds.flatMap((id) => {
      const a = pinArts?.find((x) => x.id === id);
      return a ? [toCard(a)] : [];
    }),
  };
});

export async function listMemberHandles(): Promise<string[]> {
  if (isDemo) return TEAM.map((t) => t.handle);
  const { data } = await supabasePublic().from("profiles").select("handle").eq("is_member", true);
  return (data ?? []).map((p) => p.handle);
}
