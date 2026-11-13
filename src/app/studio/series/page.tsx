import { getViewer } from "@/lib/supabase/server";
import { StudioHead } from "@/components/studio/StudioHead";
import { SeriesDesk, type DeskSeries } from "@/components/studio/SeriesDesk";
import { getT } from "@/lib/i18n/server";
import { isAdmin } from "@/lib/env";

// 연재 작업대: 시리즈 만들기 · 회차 관리
export default async function StudioSeries() {
  const t = await getT();
  const { sb, user, profile } = await getViewer();
  const [{ data: series }, { data: eps }, { data: people }] = await Promise.all([
    sb.from("series").select("*").order("updated_at", { ascending: false }),
    sb.from("articles").select("id, title, status, is_public, series_id, series_no, author_id").not("series_id", "is", null).is("deleted_at", null),
    sb.from("profiles").select("id, display_name").eq("is_member", true),
  ]);
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name]));
  const admin = isAdmin(profile);
  const list: DeskSeries[] = (series ?? []).map((s) => ({
    ...s,
    owner: s.created_by ? names.get(s.created_by) ?? "—" : "—",
    mine: s.created_by === user?.id || admin,
    episodes: (eps ?? [])
      .filter((e) => e.series_id === s.id)
      .sort((a, b) => (a.series_no ?? 9999) - (b.series_no ?? 9999))
      .map((e) => ({ id: e.id, title: e.title, no: e.series_no, state: e.is_public ? "live" : e.status === "draft" ? "draft" : "review", author: names.get(e.author_id) ?? "—" })),
  }));

  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <StudioHead title="Series" note={t("연재 · 정기간행을 만들고 회차를 이어 붙입니다", "Start serials and periodicals, then line up their episodes")} />
      <SeriesDesk list={list} />
    </div>
  );
}
