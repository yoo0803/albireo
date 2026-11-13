// 웹진 정렬: 최신 · 오래된 · 인기
export type SortMode = "latest" | "oldest" | "popular";
export const SORTS: { k: SortMode; ko: string; en: string }[] = [
  { k: "latest", ko: "최신순", en: "Latest" },
  { k: "oldest", ko: "오래된순", en: "Oldest" },
  { k: "popular", ko: "인기순", en: "Popular" },
];

type Sortable = { published_at: string | null; popularity?: number | null };

export function sortArticles<T extends Sortable>(list: T[], mode: SortMode): T[] {
  const t = (a: T) => (a.published_at ? Date.parse(a.published_at) : 0);
  const out = [...list];
  if (mode === "oldest") out.sort((a, b) => t(a) - t(b));
  else if (mode === "popular") out.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || t(b) - t(a));
  else out.sort((a, b) => t(b) - t(a));
  return out;
}
