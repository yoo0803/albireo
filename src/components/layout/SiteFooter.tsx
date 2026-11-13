import Link from "next/link";
import { TEAM } from "@/content/team";
import { getT } from "@/lib/i18n/server";

const CONTACT = "albireo.dev.00@gmail.com";

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-mark display">Albi<em>reo</em></div>
        <nav aria-label="Authors">
          {TEAM.map((m) => <Link key={m.handle} href={`/authors/${m.handle}`}>{m.name}</Link>)}
        </nav>
        <nav aria-label="Site">
          <Link href="/articles">Webzine</Link>
          <Link href="/series">Series</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/about">About</Link>
          <Link href="/credits">Credits</Link>
        </nav>
      </div>
      <div className="wrap footer-contact">
        <a href={`mailto:${CONTACT}`} className="mono">{t("운영자 문의", "Contact")}: {CONTACT}</a>
      </div>
      <div className="wrap mono faint footer-base">© {new Date().getFullYear()} Albireo / Built by Yeji C.</div>
    </footer>
  );
}
