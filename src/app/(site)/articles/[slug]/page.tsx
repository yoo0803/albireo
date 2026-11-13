import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicArticle } from "@/lib/data/public";
import { parseMarkdown, readingMinutes, toc } from "@/lib/text/markdown";
import { ArticleBody } from "@/components/article/ArticleBody";
import { Engagement } from "@/components/article/Engagement";
import { ShareButton } from "@/components/article/ShareButton";
import { lookupReferences } from "@/lib/cite/doi";
import { extractDois, sortReferences } from "@/lib/cite/apa";
import { PeerReviewStamp } from "@/components/article/PeerReviewStamp";
import { absUrl, articleJsonLd, jsonLd, ogImage } from "@/lib/seo";
import { dateLocale, translator, type Lang } from "@/lib/i18n";
import { cleanStyle, proseProps } from "@/lib/text/style";
import { CoverArt } from "@/components/art/CoverArt";
import { FontLinks } from "@/components/article/FontLinks";
import { getLang } from "@/lib/i18n/server";
import { SubscribeForm } from "@/components/layout/SubscribeForm";
import { episodeLabel, KIND, pick } from "@/content/series";

// 언어 쿠키를 읽으므로 요청마다 렌더 (정적 생성 시 실행 중 오류 방지)
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const a = await getPublicArticle(decodeURIComponent((await params).slug));
  if (!a) return { title: "Not found", robots: { index: false } };
  // 영문 모드: 영문판 제목 · 요약 우선
  const en = (await getLang()) === "en" && !!a.title_en;
  const title = en ? a.title_en! : a.title;
  const excerpt = (en ? a.excerpt_en || a.subtitle_en : null) ?? a.excerpt ?? a.subtitle ?? undefined;
  const img = ogImage({ title, kicker: (en ? a.subtitle_en : null) ?? a.subtitle ?? undefined, d: a.discipline, author: a.author.name });
  return {
    title,
    description: excerpt,
    keywords: a.tags,
    authors: [a.author, ...a.coauthors].map((p) => ({ name: p.name, url: `/authors/${p.handle}` })),
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: {
      type: "article",
      title,
      description: excerpt,
      publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at,
      authors: [a.author.name],
      tags: a.tags,
      images: [{ url: img, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: excerpt, images: [img] },
  };
}

const fmt = (iso: string | null, lang: Lang) => (iso ? new Intl.DateTimeFormat(dateLocale(lang), { dateStyle: "long" }).format(new Date(iso)) : "");

export default async function ArticlePage({ params }: Params) {
  const lang = await getLang();
  const a = await getPublicArticle(decodeURIComponent((await params).slug));
  if (!a) notFound();

  // EN 방문자: 영문판 우선
  const en = lang === "en" && !!a.body_en;
  const body = en ? a.body_en! : a.body_md;
  const title = en && a.title_en ? a.title_en : a.title;
  const subtitle = en ? a.subtitle_en ?? a.subtitle : a.subtitle;
  const style = cleanStyle(a.style);
  const blocks = parseMarkdown(body);
  const outline = toc(blocks);
  const references = sortReferences(await lookupReferences(extractDois(body)));
  const t = translator(lang);

  return (
    <article className="paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleJsonLd(a)) }} />
      <header className="wrap article-head">
        {a.series && (
          <Link href={`/series/${a.series.slug}`} className="series-ribbon">
            <span className="series-ribbon-mark">{pick(KIND[a.series.kind], lang === "en")}</span>
            <span className="series-ribbon-title">{lang === "en" && a.series.title_en ? a.series.title_en : a.series.title}</span>
            <span className="mono faint">{episodeLabel(a.series.kind, a.series_no, lang === "en")} / {a.series.total}</span>
          </Link>
        )}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {a.tags.map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
        <h1 className="article-title" lang={en ? "en" : undefined}>{title}</h1>
        {subtitle && <p className="article-sub">{subtitle}</p>}
        <div className="mono dim" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href={`/authors/${a.author.handle}`}>By {a.author.name}</Link>
          {a.coauthors.map((c) => <Link key={c.handle} href={`/authors/${c.handle}`}>+ {c.name}</Link>)}
          <time dateTime={a.published_at ?? undefined}>{fmt(a.published_at, lang)}</time>
          <span>{readingMinutes(body)} min read</span>
          <ShareButton url={absUrl(`/articles/${a.slug}`)} title={title} />
        </div>
        {lang === "en" && !a.body_en && <p className="article-lang-note">Original in Korean · English version not available</p>}
        {en && <p className="article-lang-note">English version · original in Korean</p>}
        <div className="article-cover">
          {a.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.cover_url} alt="" />
          ) : (
            <CoverArt tpl={style.cover?.tpl} tone={style.cover?.tone} field={a.discipline} title={title} kicker={t("동료 검수 웹진", "Peer-reviewed webzine")} seed={a.slug} />
          )}
        </div>
        <hr className="rule" />
      </header>
      <FontLinks id={style.font} />

      <div className="wrap article-layout">
        {outline.length > 1 && (
          <nav className="article-toc" aria-label="Contents">
            <span className="mono dim">Contents</span>
            {outline.map((h) => <a key={h.anchor} href={`#${h.anchor}`} style={{ paddingLeft: (h.level - 2) * 12 }}>{h.text}</a>)}
          </nav>
        )}
        <div className="prose" lang={en ? "en" : undefined} {...proseProps(style)}><ArticleBody blocks={blocks} references={references} /></div>
        <aside className="article-aside">
          <PeerReviewStamp reviewed={a.peer_reviewed} count={a.reviewers.length} date={a.reviewers.at(-1)?.reviewed_at} />
          <Engagement id={a.id} views={a.view_count} likes={a.like_count} />
          {a.reviewers.length > 0 && (
            <div>
              <div className="mono dim">Reviewed by</div>
              {a.reviewers.map((r) => <div key={r.handle}><Link href={`/authors/${r.handle}`}>{r.name}</Link></div>)}
            </div>
          )}
          {a.coauthors.length > 0 && (
            <div>
              <div className="mono dim">Contributions</div>
              {a.coauthors.map((c) => <div key={c.handle}>{c.name} — <span className="dim">{c.contribution}</span></div>)}
            </div>
          )}
        </aside>
      </div>
      {a.series && (a.series.prev || a.series.next) && (
        <nav className="wrap series-nav" aria-label={t("연재 회차", "Series episodes")}>
          {a.series.prev ? (
            <Link href={`/articles/${a.series.prev.slug}`} className="series-nav-item">
              <span className="label faint">← {t("이전", "Previous")} · {episodeLabel(a.series.kind, a.series.prev.no, lang === "en")}</span>
              <span className="series-nav-title">{lang === "en" && a.series.prev.title_en ? a.series.prev.title_en : a.series.prev.title}</span>
            </Link>
          ) : <span />}
          {a.series.next ? (
            <Link href={`/articles/${a.series.next.slug}`} className="series-nav-item is-next">
              <span className="label faint">{t("다음", "Next")} · {episodeLabel(a.series.kind, a.series.next.no, lang === "en")} →</span>
              <span className="series-nav-title">{lang === "en" && a.series.next.title_en ? a.series.next.title_en : a.series.next.title}</span>
            </Link>
          ) : <span />}
        </nav>
      )}
      <div className="wrap"><div className="subscribe-end"><SubscribeForm id="sub-article" /></div></div>
    </article>
  );
}
