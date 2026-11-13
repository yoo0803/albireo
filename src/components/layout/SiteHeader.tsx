import Link from "next/link";
import { SiderealClock } from "./SiderealClock";
import { ScrapMenu } from "./ScrapMenu";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";
import { getTheme } from "@/lib/theme-server";

export async function SiteHeader({ studio = false }: { studio?: boolean }) {
  const theme = await getTheme();
  return (
    <header className="site-header">
      <div className="wrap" style={studio ? { maxWidth: "none" } : undefined}>
        {/* 이름 · 시계: 한 줄 기준선에 맞춰 묶음 */}
        <div className="hdr-id">
          <Link href="/" className="brand" aria-label="Albireo home">
            <span className="brand-mark" aria-hidden="true"><i /><b /></span>
            <span className="brand-name">Albireo</span>
            <span className="brand-ko" aria-hidden="true">알비레오</span>
          </Link>
          <SiderealClock />
        </div>
        <div className="hdr-prefs">
          <ThemeToggle initial={theme} />
          <LangToggle />
        </div>
        <ScrapMenu />
      </div>
    </header>
  );
}
