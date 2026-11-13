import { SubscribeForm } from "@/components/layout/SubscribeForm";
import type { Metadata } from "next";
import { SortedGrid } from "@/components/article/SortedGrid";
import { SectionHead } from "@/components/home/SectionHead";
import { Backdrop } from "@/components/art/Backdrop";
import { CanvasWebzine } from "@/components/canvas-home/CanvasWebzine";
import { ViewSwitch } from "@/components/canvas-home/ViewSwitch";
import { listPublicArticles, listPublicSeries } from "@/lib/data/public";
import { SeriesShelf } from "@/components/series/SeriesShelf";
import Link from "next/link";
import { getLang } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const t = translator(await getLang());
  return { title: "Webzine", description: t("동료 검수를 거친 Albireo 공개 아티클 아카이브.", "Archive of Albireo's published, peer-reviewed articles."), alternates: { canonical: "/articles" } };
}

// 웹진: 캔버스 / 목록
export default async function Articles() {
  const lang = await getLang();
  const t = translator(lang);
  const [list, series] = await Promise.all([listPublicArticles({ limit: 120 }), listPublicSeries()]);

  return (
    <ViewSwitch
      canvas={<CanvasWebzine articles={list} lang={lang} series={series} />}
      extra={{
        label: t("연재", "Series"),
        node: (
          <section className="section has-backdrop">
            <Backdrop seed="albireo-series" tone="albireo" />
            <div className="wrap">
              <SectionHead no={t("연", "S")} en="Series" ko={t("연재 / 정기간행", "")} aside={<Link href="/series" className="label faint">{t("서가 전체 →", "All series →")}</Link>} />
              <SeriesShelf list={series} lang={lang} />
              <div className="subscribe-end"><SubscribeForm id="sub-series-tab" /></div>
            </div>
          </section>
        ),
      }}
      list={
        <section className="section has-backdrop">
          <Backdrop seed="albireo-commons" tone="albireo" />
          <div className="wrap">
            <SectionHead no={t("웹", "W")} en="Webzine" ko={t("웹진", "")} aside={<span className="label faint">{list.length} {t("편", list.length === 1 ? "piece" : "pieces")}</span>} />
            <SortedGrid list={list} />
            <div className="subscribe-end"><SubscribeForm id="sub-list" /></div>
          </div>
        </section>
      }
    />
  );
}
