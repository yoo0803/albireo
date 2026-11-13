import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { createCanvas } from "../actions";
import { ConfirmAction } from "@/components/studio/ConfirmAction";
import { StudioHead } from "@/components/studio/StudioHead";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { getT } from "@/lib/i18n/server";
import { BulkCheck, BulkScope } from "@/components/studio/Bulk";

export default async function CanvasIndex() {
  const t = await getT();
  const { sb, user } = await getViewer();
  const { data } = await sb.from("canvases").select("id, title, updated_at, owner_id, locked").is("deleted_at", null).order("updated_at", { ascending: false });
  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <StudioHead title="Canvas" note={t("보드 · 차트 · 무드보드 작업판", "Board · charts · moodboard")} />
      <form action={createCanvas} className="panel panel-body" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input name="title" className="input" style={{ flex: "1 1 260px" }} placeholder={t("제목", "Title")} />
        <SubmitButton pending="Creating…">Create</SubmitButton>
      </form>
      <BulkScope keys={(data ?? []).filter((c) => c.owner_id === user?.id).map((c) => `canvases:${c.id}` as const)} actions={["trash"]}>
      <div className="article-grid">
        {(data ?? []).map((c) => (
          <div key={c.id} className="card bulk-card">
            {c.owner_id === user?.id && <BulkCheck k={`canvases:${c.id}`} label={c.title} />}
            <Link href={`/studio/canvas/${c.id}`} className="card-link"><h3 className="card-title">{c.locked && <span title={t("잠김 · 나만 보기", "Private")} aria-label={t("잠김", "Private")}>🔒 </span>}{c.title}</h3></Link>
            <div className="card-meta mono faint card-row">
              <span>{c.updated_at.slice(0, 16).replace("T", " ")}</span>
              {c.owner_id === user?.id && <ConfirmAction kind="canvases" id={c.id} />}
            </div>
          </div>
        ))}
      </div>
      </BulkScope>
    </div>
  );
}
