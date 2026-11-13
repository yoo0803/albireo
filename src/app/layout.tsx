import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Diphylleia, Hahmlet, Orbit, JetBrains_Mono, Bodoni_Moda, Song_Myung } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { env } from "@/lib/env";
import { SITE, absUrl } from "@/lib/seo";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";
import { LangProvider } from "@/lib/i18n/client";
import { getTheme } from "@/lib/theme-server";

// 타이포: 라틴 디스플레이 / 국문 디스플레이 / 국문 제목 / 라벨 / 코드
const instrument = Instrument_Serif({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--f-instrument", display: "swap" });
const diphylleia = Diphylleia({ weight: "400", subsets: ["latin"], variable: "--f-diphylleia", display: "swap", preload: false });
const hahmlet = Hahmlet({ weight: "variable", subsets: ["latin"], variable: "--f-hahmlet", display: "swap", preload: false });
const orbit = Orbit({ weight: "400", subsets: ["latin"], variable: "--f-orbit", display: "swap", preload: false });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono", display: "swap", preload: false });
// 브랜드 강조 (reo)
// 궁서체가 없는 기기용 붓글씨 대체 (H 프로필 고전 제목)
const songMyung = Song_Myung({ weight: "400", variable: "--f-songmyung", display: "swap" });
const bodoni = Bodoni_Moda({ weight: "400", style: "italic", subsets: ["latin"], variable: "--f-bodoni", display: "swap" });

// 본문: Pretendard (OFL, jsDelivr 동적 서브셋)
const PRETENDARD = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
  metadataBase: new URL(env.siteUrl),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: en ? SITE.descriptionEn : SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/", types: { "application/rss+xml": absUrl("/feed.xml") } },
  openGraph: { type: "website", siteName: SITE.name, locale: en ? "en_AU" : SITE.locale, images: ["/api/og?title=Albireo"] },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f1efea" }, { media: "(prefers-color-scheme: dark)", color: "#15140f" }],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

const fonts = [instrument, diphylleia, hahmlet, orbit, mono, bodoni, songMyung].map((f) => f.variable).join(" ");

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  // 고정 테마만 속성으로 (시스템은 미디어 쿼리)
  const theme = await getTheme();
  return (
    <html lang={lang} className={fonts} data-theme={theme === "system" ? undefined : theme}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" href={PRETENDARD} />
      </head>
      <body>
        <a href="#main" className="skip">{lang === "en" ? "Skip to content" : "본문 바로가기"}</a>
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
      {env.gaId && <GoogleAnalytics gaId={env.gaId} />}
    </html>
  );
}
