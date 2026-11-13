import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { DisciplineChip } from "@/components/article/DisciplineChip";
import { createArticle } from "../actions";
import { FieldPicker } from "@/components/studio/FieldPicker";
import { StudioHead } from "@/components/studio/StudioHead";
import { ConfirmAction } from "@/components/studio/ConfirmAction";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { getT } from "@/lib/i18n/server";
import { BulkCheck, BulkScope } from "@/components/studio/Bulk";

// 전체 원고 목록
export default async function Manuscripts() {
  const t = await getT();
  const { sb, profile, user } = await getViewer();
  const { data } = await sb
    .from("articles")
    .select("id, title, status, is_public, peer_reviewed, discipline, updated_at, author_id")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <StudioHead title="Manuscripts" note={t("초안부터 발행까지의 원고 목록", "All manuscripts, draft to published")} />
      <form action={createArticle} className="panel panel-body" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div className="field" style={{ flex: "1 1 260px" }}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" className="input" required placeholder={t("새 원고 제목", "New manuscript title")} />
        </div>
        <div className="field">
          <label htmlFor="discipline">Field</label>
          <FieldPicker id="discipline" name="discipline" value={profile?.discipline ?? "cs"} />
        </div>
        <SubmitButton pending="Creating…">Create</SubmitButton>
      </form>
      <BulkScope keys={(data ?? []).filter((a) => a.author_id === user?.id).map((a) => `articles:${a.id}` as const)} actions={["trash"]}>
      <div className="panel table-scroll">
        <table className="table">
          <thead><tr><th className="bulk-col" /><th>Title</th><th>Field</th><th>Status</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td className="bulk-col">{a.author_id === user?.id && <BulkCheck k={`articles:${a.id}`} label={a.title} />}</td>
                <td><Link href={`/studio/articles/${a.id}`} className="serif">{a.title}</Link></td>
                <td><DisciplineChip d={a.discipline} /></td>
                <td className="mono dim">{a.is_public ? "public" : a.status}{a.peer_reviewed ? " · ◉ reviewed" : ""}</td>
                <td className="mono faint">{a.updated_at.slice(0, 10)}</td>
                <td style={{ textAlign: "right" }}>{a.author_id === user?.id && <ConfirmAction kind="articles" id={a.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </BulkScope>
    </div>
  );
}
