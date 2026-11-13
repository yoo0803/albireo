import type { Metadata } from "next";
import Link from "next/link";
import { SubscribeForm } from "@/components/layout/SubscribeForm";
import { ABOUT } from "@/content/about";
import { AlbireoScope } from "@/components/art/AlbireoScope";
import { FontLinks } from "@/components/article/FontLinks";
import { Backdrop } from "@/components/art/Backdrop";
import { getLang } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const a = ABOUT[await getLang()];
  return { title: "About", description: `${a.title} — ${a.lede}`, alternates: { canonical: "/about" } };
}

// Albireo 이야기: 두 개의 빛, 같은 방향
export default async function About() {
  const lang = await getLang();
  const t = translator(lang);
  const a = ABOUT[lang];
  return (
    <article className="about has-backdrop">
      <FontLinks id="song-myung" />
      <Backdrop seed="albireo-about" tone="albireo" />
      <header className="wrap about-hero">
        <div className="stack" style={{ ["--gap" as string]: "20px" }}>
          <span className="label faint">{a.kicker}</span>
          <h1 className="about-title">{a.title}</h1>
          <p className="about-legend label">
            <span><i className="dot-a" aria-hidden="true" />Albireo A</span>
            <span><i className="dot-b" aria-hidden="true" />Albireo B</span>
          </p>
        </div>
        <div className="about-art">
          <AlbireoScope />
        </div>
      </header>

      <div className="wrap about-body">
        {a.chapters.map((c, i) => (
          <section key={c.no} className="about-ch" aria-labelledby={`ch-${i}`}>
            <div className="about-ch-head">
              <span className="about-no" aria-hidden="true">{c.no}</span>
              <h2 id={`ch-${i}`}>{c.title}</h2>
            </div>
            <div className="about-ch-text">
              {c.body.map((p, k) => <p key={k}>{p}</p>)}
              {c.quote && <blockquote className="about-quote">{c.quote}</blockquote>}
            </div>
            {i === 1 && (
              <aside className="about-facts" aria-label={t("알비레오 개요", "Albireo at a glance")}>
                <dl>
                  {a.facts.map(([k, v]) => (
                    <div key={k}><dt className="label">{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              </aside>
            )}
          </section>
        ))}

        <footer className="about-close">
          <p>{a.close}</p>
          <div className="about-links">
            <Link href="/members" className="btn">{t("멤버 보기", "Meet the members")} →</Link>
            <Link href="/articles" className="btn btn-gold">{t("웹진 읽기", "Read the webzine")} →</Link>
          </div>
        </footer>
        <div className="subscribe-end"><SubscribeForm id="sub-about" /></div>
      </div>
    </article>
  );
}
