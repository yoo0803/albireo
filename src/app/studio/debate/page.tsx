import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { createTopic } from "../actions";
import { ConfirmAction } from "@/components/studio/ConfirmAction";
import { StudioHead } from "@/components/studio/StudioHead";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { getT } from "@/lib/i18n/server";
import { BulkCheck, BulkScope } from "@/components/studio/Bulk";

// 토론 주제 목록
export default async function DebateIndex() {
  const t = await getT();
  const { sb, user } = await getViewer();
  const [{ data: topics }, { data: articles }, { data: counts }] = await Promise.all([
    sb.from("debate_topics").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    sb.from("articles").select("id, title").is("deleted_at", null).order("updated_at", { ascending: false }).limit(50),
    sb.from("debate_comments").select("topic_id").is("deleted_at", null),
  ]);
  const n = new Map<string, number>();
  (counts ?? []).forEach((c) => n.set(c.topic_id, (n.get(c.topic_id) ?? 0) + 1));

  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <StudioHead title="Debate arena" note={t("주제별 토론", "Debate by topic")} />
      <form action={createTopic} className="panel panel-body stack">
        <div className="field"><label htmlFor="t">Topic</label><input id="t" name="title" className="input" required placeholder={t("주제", "Topic")} /></div>
        <div className="field"><label htmlFor="p">Prompt</label><textarea id="p" name="prompt" className="textarea" style={{ minHeight: 70 }} /></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div className="field" style={{ flex: "1 1 260px" }}>
            <label htmlFor="a">Linked article (optional)</label>
            <select id="a" name="article_id" className="select"><option value="">—</option>{(articles ?? []).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
          </div>
          <SubmitButton pending="Opening…">Open topic</SubmitButton>
        </div>
      </form>
      <BulkScope keys={(topics ?? []).filter((x) => x.created_by === user?.id).map((x) => `debate_topics:${x.id}` as const)} actions={["trash"]}>
      <div className="article-grid">
        {(topics ?? []).map((t) => (
          <div key={t.id} className="card bulk-card">
            {t.created_by === user?.id && <BulkCheck k={`debate_topics:${t.id}`} label={t.title} />}
            <span className="mono faint">{t.created_at.slice(0, 10)}</span>
            <Link href={`/studio/debate/${t.id}`} className="card-link"><h3 className="card-title">{t.title}</h3></Link>
            {t.prompt && <p className="dim" style={{ fontSize: "0.9rem" }}>{t.prompt}</p>}
            <div className="card-meta mono faint card-row">
              <span>{n.get(t.id) ?? 0} comments</span>
              {t.created_by === user?.id && <ConfirmAction kind="debate_topics" id={t.id} />}
            </div>
          </div>
        ))}
      </div>
      </BulkScope>
    </div>
  );
}
