import Link from "next/link";
import { LazyAscii } from "@/components/canvas-home/LazyAscii";
import { isPiece } from "@/components/ascii/pieces";
import type { Member } from "@/content/team";
import type { AuthorPage } from "@/lib/data/public";
import type { Lang, T } from "@/lib/i18n";

export type MemberEntry = { m: Member; p: AuthorPage | null };

// 멤버: 2×2 사분할 (모바일: 세로 카드)
export function MemberGrid({ list, lang, t }: { list: MemberEntry[]; lang: Lang; t: T }) {
  return (
    <div className="quads">
      {list.map(({ m, p }, i) => {
        const works = (p?.pins.length ? p.pins : p?.articles ?? []).slice(0, 3);
        return (
          <article key={m.handle} className="quad" data-d={m.discipline}>
            <div className="quad-text">
              <span className="quad-no label">{String(i + 1).padStart(2, "0")} / {m.role}</span>
              <h2 className="quad-name">
                <Link href={`/authors/${m.handle}`} className="quad-link">{p?.byline.name ?? m.name}</Link>
              </h2>
              {p?.bio && <p className="quad-bio">{p.bio}</p>}
              {works.length > 0 && (
                <ul className="quad-works">
                  {works.map((a) => (
                    <li key={a.id}><Link href={`/articles/${a.slug}`}>{lang === "en" && a.title_en ? a.title_en : a.title}</Link></li>
                  ))}
                </ul>
              )}
              <span className="quad-stats label">
                {p?.stats.articles ?? 0} {t("편", "articles")} / {t("검수", "reviews")} {p?.stats.reviews ?? 0}
              </span>
            </div>
            <span className="quad-lens" aria-hidden="true">{isPiece(m.piece) && <LazyAscii piece={m.piece} label={`${m.name} · ${m.major}`} />}</span>
            <span className="quad-go label" aria-hidden="true">{t("프로필", "Profile")} →</span>
          </article>
        );
      })}
    </div>
  );
}
