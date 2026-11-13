import type { Metadata } from "next";
import { SectionHead } from "@/components/home/SectionHead";
import { Backdrop } from "@/components/art/Backdrop";
import { SeriesShelf } from "@/components/series/SeriesShelf";
import { listPublicSeries } from "@/lib/data/public";
import { getLang } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = translator(await getLang());
  return { title: t("연재", "Series"), description: t("Albireo 의 연재와 정기간행물.", "Albireo's serials and periodicals."), alternates: { canonical: "/series" } };
}

// 웹진 연재 서가
export default async function SeriesIndex() {
  const lang = await getLang();
  const t = translator(lang);
  const list = await listPublicSeries();
  return (
    <section className="section has-backdrop">
      <Backdrop seed="albireo-series" tone="albireo" />
      <div className="wrap">
        <SectionHead no={t("연", "S")} en="Series" ko={t("연재 · 정기간행", "")} aside={<span className="label faint">{list.length} {t("묶음", list.length === 1 ? "series" : "series")}</span>} />
        <SeriesShelf list={list} lang={lang} />
      </div>
    </section>
  );
}
