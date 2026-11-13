import type { MetadataRoute } from "next";
import { listMemberHandles, listPublicArticles, listPublicSeries } from "@/lib/data/public";
import { absUrl } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, handles, series] = await Promise.all([
    listPublicArticles({ limit: 1000 }).catch(() => []),
    listMemberHandles().catch(() => []),
    listPublicSeries().catch(() => []),
  ]);
  return [
    { url: absUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absUrl("/articles"), changeFrequency: "daily", priority: 0.9 },
    { url: absUrl("/series"), changeFrequency: "weekly", priority: 0.8 },
    ...series.map((x) => ({ url: absUrl(`/series/${x.slug}`), lastModified: x.latest ?? x.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: absUrl("/members"), changeFrequency: "weekly", priority: 0.6 },
    { url: absUrl("/about"), changeFrequency: "yearly", priority: 0.5 },
    { url: absUrl("/credits"), changeFrequency: "yearly", priority: 0.2 },
    ...articles.map((a) => ({ url: absUrl(`/articles/${a.slug}`), lastModified: a.updated_at, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...handles.map((h) => ({ url: absUrl(`/authors/${h}`), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
