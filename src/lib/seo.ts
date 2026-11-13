import type { ArticleFull } from "@/lib/data/public";
import { env } from "@/lib/env";

export const SITE = {
  name: "Albireo",
  tagline: "Peer-reviewed webzine",
  description: "대학생 4인이 함께 쓰고 서로 검수하는 동료 검수 웹진.",
  descriptionEn: "A peer-reviewed webzine written and reviewed by four university students.",
  locale: "ko_KR",
};

export const absUrl = (path = "/") => `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

export const ogImage = (p: { title: string; kicker?: string; d?: string; author?: string }) => {
  const q = new URLSearchParams({ title: p.title, ...(p.kicker && { kicker: p.kicker }), ...(p.d && { d: p.d }), ...(p.author && { author: p.author }) });
  return `/api/og?${q.toString()}`;
};

// schema.org Article (구글 리치 결과)
export function articleJsonLd(a: ArticleFull) {
  const person = (b: { name: string; handle: string }) => ({ "@type": "Person", name: b.name, url: absUrl(`/authors/${b.handle}`) });
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    alternativeHeadline: a.subtitle ?? undefined,
    description: a.excerpt ?? undefined,
    inLanguage: "ko-KR",
    datePublished: a.published_at ?? a.created_at,
    dateModified: a.updated_at,
    mainEntityOfPage: absUrl(`/articles/${a.slug}`),
    image: [absUrl(ogImage({ title: a.title, d: a.discipline, author: a.author.name }))],
    author: [person(a.author), ...a.coauthors.map(person)],
    publisher: { "@type": "Organization", name: SITE.name, url: absUrl("/") },
    keywords: a.tags.join(", "),
    ...(a.peer_reviewed && { review: { "@type": "Review", reviewBody: "Peer-reviewed by Albireo Collective", author: a.reviewers.map(person) } }),
  };
}

// JSON-LD 직렬화: </script> 차단
export const jsonLd = (obj: unknown) => JSON.stringify(obj).replace(/</g, "\\u003c");
