"use client";
import Link from "next/link";
import type { ArticleCard as Card } from "@/lib/data/public";
import { CoverArt } from "@/components/art/CoverArt";
import { useLang } from "@/lib/i18n/client";
import { cleanStyle } from "@/lib/text/style";
import { fieldLabel } from "@/content/fields";
import { Tilt } from "@/components/motion/Tilt";
import { KIND, pick } from "@/content/series";
import { RocketGlyph } from "@/components/reactions/Reactions";

const fmt = (iso: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, ".") : "—");

export function ArticleCard({ a, index }: { a: Card; index?: number }) {
  const en = useLang() === "en";
  const title = en && a.title_en ? a.title_en : a.title;
  return (
    <Link href={`/articles/${a.slug}`} className="card" data-d={a.discipline}>
      <Tilt className="card-cover">
        {a.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover_url} alt="" loading="lazy" />
        ) : (
          <CoverArt tpl={cleanStyle(a.style).cover?.tpl} tone={cleanStyle(a.style).cover?.tone} field={a.discipline} title={title} kicker={fieldLabel(a.discipline)} seed={a.slug} />
        )}
        {a.peer_reviewed && <span className="card-seal mono" title="Peer-Reviewed">◉ PR</span>}
      </Tilt>
      <div className="card-meta mono faint">
        {index !== undefined && <span>№{String(index + 1).padStart(2, "0")}</span>}
        <span>{a.author.name}</span>
      </div>
      {a.series && <span className="card-series label">{pick(KIND[a.series.kind], en)}</span>}
      <h3 className="card-title">{title}</h3>
      <div className="mono faint card-by card-row">
        <span>{fmt(a.published_at)}</span>
        <span aria-label={`${a.view_count ?? 0} views, ${a.like_count ?? 0} likes`}>{a.view_count ?? 0} views · <RocketGlyph /> {a.like_count ?? 0}</span>
      </div>
    </Link>
  );
}
