import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSeries } from "@/lib/data/public";
import { getLang } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";
import { CoverArt } from "@/components/art/CoverArt";
import { cleanStyle } from "@/lib/text/style";
import { fieldLabel } from "@/content/fields";
import { KIND, episodeLabel, pick } from "@/content/series";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const s = await getPublicSeries(decodeURIComponent((await params).slug));
  if (!s) return { title: "Not found", robots: { index: false } };
  const en = (await getLang()) === "en";
  return {
    title: en && s.title_en ? s.title_en : s.title,
    description: (en ? s.blurb_en : null) ?? s.blurb ?? undefined,
    alternates: { canonical: `/series/${s.slug}` },
  };
}

// 연재 차례: 회차 번호 순 목록
export default async function SeriesPage({ params }: Params) {
  const lang = await getLang();
  const en = lang === "en";
  const t = translator(lang);
  const s = await getPublicSeries(decodeURIComponent((await params).slug));
  if (!s) notFound();
  const title = en && s.title_en ? s.title_en : s.title;
  const blurb = en && s.blurb_en ? s.blurb_en : s.blurb;
  const first = s.episodes[0];

  return (
    <article className="wrap series-page">
      <Link href="/series" className="mono dim">← {t("연재 서가", "All series")}</Link>
      <header className="series-head">
        <span className="series-mark" aria-hidden="true">{en ? "Series" : "연재"}</span>
        <div className="series-head-text">
          <span className="label series-meta">{pick(KIND[s.kind], en)}</span>
          <h1 className="series-title">{title}</h1>
          {blurb && <p className="series-blurb">{blurb}</p>}
          {first && (
            <Link href={`/articles/${first.slug}`} className="btn btn-gold series-start">
              {s.kind === "periodical" ? t("창간호부터 읽기", "Start from the first issue") : t("1화부터 읽기", "Start from episode 1")} →
            </Link>
          )}
        </div>
      </header>

      <ol className="series-toc">
        {s.episodes.map((e) => {
          const et = en && e.title_en ? e.title_en : e.title;
          return (
            <li key={e.id}>
              <Link href={`/articles/${e.slug}`} className="series-ep">
                <span className="series-no">{e.series_no != null ? String(e.series_no).padStart(2, "0") : "—"}</span>
                <span className="series-ep-text">
                  <span className="label faint">{episodeLabel(s.kind, e.series_no, en)}</span>
                  <span className="series-ep-title">{et}</span>
                  {e.excerpt && !en && <span className="series-ep-sub dim">{e.excerpt}</span>}
                </span>
                <span className="series-thumb" aria-hidden="true">
                  {e.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.cover_url} alt="" loading="lazy" />
                  ) : (
                    <CoverArt tpl={cleanStyle(e.style).cover?.tpl} tone={cleanStyle(e.style).cover?.tone} field={e.discipline} title={et} kicker={fieldLabel(e.discipline)} seed={e.slug} />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
