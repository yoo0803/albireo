import type { Article, Series } from "@/types/database";

// 데모 데이터: Supabase 미연결 시 공개 페이지 렌더용
type DemoArticle = Article & { authorHandle: string; coauthors: { handle: string; contribution: string }[]; reviewers: string[] };

const base = {
  cover_url: null,
  deleted_at: null,
  view_count: 0,
  like_count: 0,
  popularity: 0,
  title_en: null,
  subtitle_en: null,
  excerpt_en: null,
  body_en: null,
  style: {},
  notified_at: null,
  series_id: null as string | null,
  series_no: null as number | null,
  status: "approved" as const,
  is_public: true,
  peer_reviewed: true,
  author_id: "demo",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-18T00:00:00Z",
};

export const DEMO_ARTICLES: DemoArticle[] = [
  {
    ...base,
    id: "demo-rls",
    slug: "row-level-security-belongs-in-the-database",
    title: "Sample Text",
    subtitle: "Sample Text",
    excerpt: "Sample Text",
    discipline: "cs",
    tags: ["Sample"],
    published_at: "2026-10-18T09:00:00Z",
    authorHandle: "yeji",
    coauthors: [{ handle: "englit", contribution: "용어 검수" }],
    reviewers: ["yeji", "chem", "klit", "englit"],
    body_md: `## Sample Text

Sample Text. Sample Text. Sample Text.

## Sample Text

Sample Text. Sample Text.`,
  },
  {
    ...base,
    id: "demo-ph",
    slug: "ph-meter-temperature-slope",
    title: "Sample Text",
    subtitle: "Sample Text",
    excerpt: "Sample Text",
    discipline: "chem",
    tags: ["Sample"],
    published_at: "2026-10-12T09:00:00Z",
    authorHandle: "chem",
    coauthors: [{ handle: "yeji", contribution: "차트 컴포넌트" }],
    reviewers: ["yeji", "chem", "klit", "englit"],
    body_md: `## Sample Text

Sample Text. Sample Text. Sample Text.

## Sample Text

Sample Text. Sample Text.`,
  },
  {
    ...base,
    id: "demo-ux",
    slug: "conditions-for-a-readable-screen",
    title: "Sample Text",
    subtitle: "Sample Text",
    excerpt: "Sample Text",
    discipline: "klit",
    tags: ["Sample"],
    published_at: "2026-10-05T09:00:00Z",
    authorHandle: "klit",
    coauthors: [{ handle: "englit", contribution: "문장 검수" }],
    reviewers: ["yeji", "chem", "klit", "englit"],
    body_md: `## Sample Text

Sample Text. Sample Text. Sample Text.

## Sample Text

Sample Text. Sample Text.`,
  },
  {
    ...base,
    id: "demo-prop",
    slug: "proportionality-principle-concept-map",
    title: "Sample Text",
    subtitle: "Sample Text",
    excerpt: "Sample Text",
    discipline: "englit",
    tags: ["Sample"],
    published_at: "2026-09-28T09:00:00Z",
    authorHandle: "englit",
    coauthors: [{ handle: "klit", contribution: "도식 디렉팅" }],
    reviewers: ["yeji", "chem", "klit", "englit"],
    body_md: `## Sample Text

Sample Text. Sample Text. Sample Text.

## Sample Text

Sample Text. Sample Text.`,
  },
];

// 데모 연재 · 정기간행
export const DEMO_SERIES: Series[] = [
  { id: "demo-s1", slug: "sample-serial", title: "Sample Serial", title_en: null, blurb: "Sample Text", blurb_en: null, kind: "serial", cadence: "monthly", status: "ongoing", created_by: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-18T00:00:00Z" },
  { id: "demo-s2", slug: "sample-quarterly", title: "Sample Quarterly", title_en: null, blurb: "Sample Text", blurb_en: null, kind: "periodical", cadence: "quarterly", status: "ongoing", created_by: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-18T00:00:00Z" },
];
for (const [id, s, n] of [["demo-rls", "demo-s1", 2], ["demo-ph", "demo-s1", 1], ["demo-ux", "demo-s2", 1]] as const) {
  const a = DEMO_ARTICLES.find((x) => x.id === id);
  if (a) { a.series_id = s; a.series_no = n; }
}

export const findDemo = (slug: string) => DEMO_ARTICLES.find((a) => a.slug === slug) ?? null;
