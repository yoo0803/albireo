import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthor } from "@/lib/data/public";
import { ArticleCard } from "@/components/article/ArticleCard";
import { SortedGrid } from "@/components/article/SortedGrid";
import { ShareButton } from "@/components/article/ShareButton";
import { AsciiPiece } from "@/components/ascii/AsciiPiece";
import { ScrambleText } from "@/components/glyph/ScrambleText";
import { SectionHead } from "@/components/home/SectionHead";
import { Backdrop } from "@/components/art/Backdrop";
import { TEAM } from "@/content/team";
import { isPiece } from "@/components/ascii/pieces";
import { absUrl, jsonLd, ogImage } from "@/lib/seo";
import { getT } from "@/lib/i18n/server";
import { SubscribeForm } from "@/components/layout/SubscribeForm";

// 언어 쿠키를 읽으므로 요청마다 렌더 (정적 생성 시 실행 중 오류 방지)
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getT();
  const p = await getAuthor((await params).handle);
  if (!p) return { title: "Not found", robots: { index: false } };
  const img = ogImage({ title: p.byline.name, kicker: p.byline.role ?? undefined, d: p.byline.discipline ?? undefined });
  return {
    title: `${p.byline.name} — ${p.byline.role ?? "Contributor"}`,
    description: t(`${p.byline.name}의 Albireo 기여 이력: 아티클 ${p.stats.articles}편, 피어 리뷰 ${p.stats.reviews}건.`, `${p.byline.name} on Albireo: ${p.stats.articles} articles, ${p.stats.reviews} peer reviews.`),
    alternates: { canonical: `/authors/${p.byline.handle}` },
    openGraph: { type: "profile", images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [img] },
  };
}

// 공저자 웹 이력서
export default async function AuthorPage({ params }: Params) {
  const t = await getT();
  const p = await getAuthor((await params).handle);
  if (!p) notFound();
  const team = TEAM.find((t) => t.handle === p.byline.handle) ?? TEAM.find((t) => t.discipline === p.byline.discipline);
  const d = p.byline.discipline;

  const stats = [
    ["Articles", p.stats.articles],
    ["Co-authored", p.stats.coauthored],
    ["Reviews", p.stats.reviews],
    ["Annotations", p.stats.annotations],
    ["Debate", p.stats.debate_comments],
  ] as const;

  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: { "@type": "Person", name: p.byline.name, jobTitle: p.byline.role, url: absUrl(`/authors/${p.byline.handle}`), memberOf: { "@type": "Organization", name: "Albireo" } },
  };

  return (
    <div className="wrap has-backdrop" data-d={d ?? undefined}>
      <Backdrop seed={`member-${p.byline.handle}`} tone={d ?? "albireo"} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <header className="resume-head">
        <div className="stack" style={{ ["--gap" as string]: "18px" }}>
          <span className="label faint">Albireo · Member</span>
          <h1 className="display" style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}><ScrambleText text={p.byline.name} trigger="mount" /></h1>
          <p className="serif" style={{ fontSize: "1.3rem" }}>{p.byline.role}</p>
          {p.bio && <p className="dim" style={{ maxWidth: "36em" }}>{p.bio}</p>}
          <div><ShareButton url={absUrl(`/authors/${p.byline.handle}`)} title={`${p.byline.name} · Albireo`} label={t("프로필 공유", "Share profile")} /></div>
        </div>
        {team && isPiece(team.piece) && (
          <div className="resume-lens"><AsciiPiece piece={team.piece} className="ascii-fit" label={`${team.name} · ${team.major}`} /></div>
        )}
      </header>

      <div className="stat-row" aria-label="Contribution stats">
        {stats.map(([k, v]) => (
          <div key={k}><strong>{v}</strong><span className="mono faint">{k}</span></div>
        ))}
      </div>

      {p.pins.length > 0 && (
        <section className="section" style={{ paddingTop: 64, paddingBottom: 0 }}>
          <SectionHead no="◉" en="Highlights" ko={t("고정", "")} aside={<span className="label faint">{p.pins.length} / 3</span>} />
          <div className="article-grid">{p.pins.map((a, i) => <ArticleCard key={a.id} a={a} index={i} />)}</div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 64 }}>
        <SectionHead no="1" en="Lead author" ko={t("주저자", "")} aside={<span className="label faint">{p.articles.length} {t("편", "")}</span>} />
        <SortedGrid list={p.articles} empty={t("공개 아티클 없음", "No published articles")} remember={false} />

        {p.coauthored.length > 0 && (
          <>
            <div style={{ marginTop: 72 }}><SectionHead no="2" en="Co-authored" ko={t("공저", "")} aside={<span className="label faint">{p.coauthored.length} {t("편", "")}</span>} /></div>
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Article</th><th>Lead</th><th>Contribution</th></tr></thead>
                <tbody>
                  {p.coauthored.map((a) => (
                    <tr key={a.id}>
                      <td><a href={`/articles/${a.slug}`} className="serif">{a.title}</a></td>
                      <td className="dim">{a.author.name}</td>
                      <td>{a.contribution ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <div className="subscribe-end"><SubscribeForm id="sub-author" /></div>
    </div>
  );
}
