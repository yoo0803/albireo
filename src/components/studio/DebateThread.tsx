"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { buildTree, countDescendants, type Node } from "@/lib/threads/tree";
import { ConfirmButton } from "@/components/studio/ConfirmAction";
import { InsertBar } from "@/components/studio/InsertBar";
import { renderInline } from "@/components/article/ArticleBody";
import { parseInline } from "@/lib/text/markdown";
import type { DebateComment, Discipline } from "@/types/database";
import { useT } from "@/lib/i18n/client";

type Member = { id: string; display_name: string; discipline: Discipline | null };
type Props = {
  topicId: string;
  me: { id: string; discipline: Discipline | null };
  members: Member[];
  initial: DebateComment[];
};

const MAX_INDENT = 5; // 모바일 가독 한계

// 중첩 토론 트리
export function DebateThread({ topicId, me, members, initial }: Props) {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState(initial);
  const who = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  useEffect(() => {
    const ch = sb
      .channel(`debate:${topicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "debate_comments", filter: `topic_id=eq.${topicId}` }, (p) => {
        const row = p.new as DebateComment;
        if (!row?.id) return;
        setRows((xs) => (xs.some((x) => x.id === row.id) ? xs.map((x) => (x.id === row.id ? row : x)) : [...xs, row]));
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [sb, topicId]);

  const tree = useMemo(() => buildTree(rows), [rows]);

  const post = async (body: string, parent: string | null) => {
    const { data, error } = await sb.from("debate_comments").insert({ topic_id: topicId, parent_id: parent, body, author_id: me.id }).select().single();
    if (!error && data) setRows((xs) => (xs.some((x) => x.id === data.id) ? xs : [...xs, data]));
    return !error;
  };

  const remove = async (id: string) => {
    await sb.from("debate_comments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  };

  return (
    <div className="stack" style={{ ["--gap" as string]: "24px" }}>
      <Composer onSubmit={(b) => post(b, null)} />
      <p className="mono faint" style={{ margin: 0 }}>{rows.filter((r) => !r.deleted_at).length} comments</p>

      <div className="thread">
        {tree.map((n) => <ThreadNode key={n.id} n={n} who={who} meId={me.id} onReply={post} onDelete={remove} />)}
      </div>
    </div>
  );
}

function ThreadNode({ n, who, meId, onReply, onDelete }: {
  n: Node<DebateComment>;
  who: Map<string, Member>;
  meId: string;
  onReply: (body: string, parent: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const author = who.get(n.author_id);
  const deleted = !!n.deleted_at;
  const indent = n.depth >= MAX_INDENT;

  return (
    <div className="thread-node" data-depth={n.depth} data-d={author?.discipline ?? undefined} style={indent ? { paddingLeft: 0, borderLeft: 0 } : undefined}>
      <div className="thread-meta">
        <b style={{ fontSize: "0.92rem" }}>{author?.display_name ?? "—"}</b>
        <time className="mono faint">{n.created_at.slice(5, 16).replace("T", " ")}</time>
      </div>
      <p style={{ whiteSpace: "pre-wrap", color: deleted ? "var(--fg-faint)" : undefined }}>{deleted ? t("[삭제된 댓글]", "[deleted]") : renderInline(parseInline(n.body))}</p>
      <div style={{ display: "flex", gap: 4 }}>
        {!deleted && <button className="btn btn-sm btn-ghost" onClick={() => setOpen((v) => !v)}>Reply</button>}
        {n.children.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => setCollapsed((v) => !v)}>{collapsed ? `+ ${countDescendants(n)}` : "−"}</button>}
        {n.author_id === meId && !deleted && <ConfirmButton label="Delete" ask={t("삭제하시겠습니까?", "Delete this?")} ok={t("삭제", "Delete")} onConfirm={async () => { await onDelete(n.id); }} />}
      </div>
      {open && <Composer compact onSubmit={async (b) => { const ok = await onReply(b, n.id); if (ok) setOpen(false); return ok; }} />}
      {!collapsed && n.children.length > 0 && (
        <div className="thread-children">
          {n.children.map((c) => <ThreadNode key={c.id} n={c} who={who} meId={meId} onReply={onReply} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}

function Composer({ onSubmit, compact }: { onSubmit: (body: string) => Promise<boolean>; compact?: boolean }) {
  const t = useT();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      style={{ ["--gap" as string]: "8px" }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        if (await onSubmit(body.trim())) setBody("");
        setBusy(false);
      }}
    >
      <InsertBar compact onCite={(title, url) => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}[${title.replace(/[[\]]/g, "")}](${url}) `)} />
      <textarea className="textarea" style={{ minHeight: compact ? 70 : 100 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("댓글", "Comment")} maxLength={5000} />
      <button className="btn btn-gold btn-sm" style={{ justifySelf: "start" }} disabled={busy}>{t("올리기", "Post")}</button>
    </form>
  );
}
