import type { Metadata } from "next";
import { getAuthor } from "@/lib/data/public";
import { TEAM } from "@/content/team";
import { ViewSwitch } from "@/components/canvas-home/ViewSwitch";
import { MemberGrid } from "@/components/members/MemberGrid";
import { MemberMap } from "@/components/members/MemberMap";
import { getLang } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n";

export const revalidate = 600;
export async function generateMetadata(): Promise<Metadata> {
  const t = translator(await getLang());
  return { title: "Members", description: t("Albireo 멤버 네 명과 각자 발행한 글.", "The four members of Albireo and what each has published."), alternates: { canonical: "/members" } };
}

// 멤버 소개: 사분할 · 마인드맵 캔버스
export default async function Members() {
  const lang = await getLang();
  const t = translator(lang);
  const list = await Promise.all(TEAM.map(async (m) => ({ m, p: await getAuthor(m.handle).catch(() => null) })));
  return (
    <>
      <h1 className="sr-only">Albireo — {t("멤버", "Members")}</h1>
      <ViewSwitch
        storageKey="albireo:members-view"
        initial="list"
        listLabel={t("사분할", "Grid")}
        list={<MemberGrid list={list} lang={lang} t={t} />}
        canvas={<MemberMap list={list} lang={lang} />}
      />
    </>
  );
}
