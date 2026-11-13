import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { StudioHead } from "@/components/studio/StudioHead";
import { ConfirmAction } from "@/components/studio/ConfirmAction";
import type { TrashKind } from "../actions";
import { getT } from "@/lib/i18n/server";
import { BulkCheck, BulkScope } from "@/components/studio/Bulk";
import { purgeExpired } from "../actions";

type Row = { kind: TrashKind; id: string; title: string; owner: string; deleted_at: string; href: string };

const KIND_LABEL: Record<TrashKind, string> = { articles: "Manuscript", canvases: "Canvas", debate_topics: "Topic" };

// 휴지통
export default async function Trash() {
  const t = await getT();
  const { sb, user } = await getViewer();
  // 30일 지난 항목 먼저 정리
  await purgeExpired().catch(() => {});
  const [{ data: arts }, { data: cans }, { data: tops }] = await Promise.all([
    sb.from("articles").select("id, title, author_id, deleted_at").not("deleted_at", "is", null),
    sb.from("canvases").select("id, title, owner_id, deleted_at").not("deleted_at", "is", null),
    sb.from("debate_topics").select("id, title, created_by, deleted_at").not("deleted_at", "is", null),
  ]);

  const rows: Row[] = [
    ...(arts ?? []).map((a) => ({ kind: "articles" as const, id: a.id, title: a.title, owner: a.author_id, deleted_at: a.deleted_at!, href: `/studio/articles/${a.id}` })),
    ...(cans ?? []).map((c) => ({ kind: "canvases" as const, id: c.id, title: c.title, owner: c.owner_id, deleted_at: c.deleted_at!, href: `/studio/canvas/${c.id}` })),
    ...(tops ?? []).map((t) => ({ kind: "debate_topics" as const, id: t.id, title: t.title, owner: t.created_by, deleted_at: t.deleted_at!, href: `/studio/debate/${t.id}` })),
  ].sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  const now = Date.now();

  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <StudioHead title="Trash" note={t("삭제한 원고 · 캔버스 · 토론 주제 보관 · 30일 뒤 자동 삭제", "Deleted items · removed for good after 30 days")} />
      <BulkScope keys={rows.map((r) => `${r.kind}:${r.id}` as const)} actions={["restore", "purge"]}>
      <div className="panel table-scroll">
        <table className="table">
          <thead><tr><th className="bulk-col" /><th>Title</th><th>Type</th><th>Deleted</th><th>{t("자동 삭제", "Auto-delete")}</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => {
              const left = Math.max(0, Math.ceil(30 - (now - Date.parse(r.deleted_at)) / 864e5));
              return (
              <tr key={`${r.kind}-${r.id}`}>
                <td className="bulk-col"><BulkCheck k={`${r.kind}:${r.id}`} label={r.title} /></td>
                <td><Link href={r.href} className="serif">{r.title}</Link></td>
                <td className="mono dim">{KIND_LABEL[r.kind]}</td>
                <td className="mono faint">{r.deleted_at.slice(0, 16).replace("T", " ")}</td>
                <td className={`mono ${left <= 3 ? "trash-soon" : "faint"}`}>{t(`${left}일 뒤`, `in ${left}d`)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <ConfirmAction kind={r.kind} id={r.id} mode="restore" />
                  {r.owner === user?.id && <ConfirmAction kind={r.kind} id={r.id} mode="purge" />}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="dim panel-body">{t("비어 있음", "Empty")}</p>}
      </div>
      </BulkScope>
    </div>
  );
}
