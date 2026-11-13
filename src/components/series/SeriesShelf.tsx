import Link from "next/link";
import type { SeriesSummary } from "@/lib/data/public";
import { CoverArt } from "@/components/art/CoverArt";
import { cleanStyle } from "@/lib/text/style";
import { fieldLabel } from "@/content/fields";
import { KIND, pick } from "@/content/series";
import type { Lang } from "@/lib/i18n";

// 웹진 연재 서가: 시리즈마다 회차 표지를 겹쳐 쌓은 묶음
export function SeriesShelf({ list, lang }: { list: SeriesSummary[]; lang: Lang }) {
  const en = lang === "en";
  if (!list.length) {
    return <p className="shelf-empty dim">{en ? "No series yet. The first one will appear here." : "아직 연재가 없습니다. 첫 연재가 시작되면 이곳에 꽂힙니다."}</p>;
  }
  return (
    <div className="shelf">
      {list.map((s) => {
        const title = en && s.title_en ? s.title_en : s.title;
        const blurb = en && s.blurb_en ? s.blurb_en : s.blurb;
        const covers = s.episodes.slice(-3);
        return (
          <Link key={s.id} href={`/series/${s.slug}`} className="shelf-item" data-kind={s.kind}>
            <div className="shelf-stack" aria-hidden="true">
              {covers.map((e, i) => (
                <div key={e.id} className="shelf-cover" style={{ ["--i" as string]: i - (covers.length - 1) }}>
                  {e.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.cover_url} alt="" loading="lazy" />
                  ) : (
                    <CoverArt tpl={cleanStyle(e.style).cover?.tpl} tone={cleanStyle(e.style).cover?.tone} field={e.discipline} title={e.title} kicker={fieldLabel(e.discipline)} seed={e.slug} />
                  )}
                </div>
              ))}
              <span className="shelf-count mono">{s.episodes.length}</span>
            </div>
            <div className="shelf-text">
              <span className="label shelf-kind">{pick(KIND[s.kind], en)}</span>
              <h3 className="shelf-title">{title}</h3>
              {blurb && <p className="shelf-blurb">{blurb}</p>}
              <div className="shelf-foot mono faint">
                <span className="shelf-ticks" aria-label={en ? `${s.episodes.length} published` : `${s.episodes.length}편 공개`}>
                  {s.episodes.slice(0, 12).map((e) => <i key={e.id} />)}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
