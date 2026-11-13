"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { parseMarkdown } from "@/lib/text/markdown";
import { ArticleBody } from "@/components/article/ArticleBody";
import { useReferences } from "@/lib/cite/client";
import type { Annotation, AnnotationReply } from "@/types/database";
import { useT } from "@/lib/i18n/client";

type Color = Annotation["color"];
const COLORS: { c: Color; v: string }[] = [
  { c: "gold", v: "var(--gold)" },
  { c: "blue", v: "var(--blue)" },
  { c: "rose", v: "var(--rose)" },
  { c: "sage", v: "var(--sage)" },
];

type Props = {
  articleId: string;
  body: string;
  me: { id: string; name: string };
  people: Record<string, string>; // id → 이름
  initial: { annotations: Annotation[]; replies: AnnotationReply[] };
};

type Draft = { sid: string; start: number; end: number; quote: string; x: number; y: number };

const supportsHighlight = () => typeof CSS !== "undefined" && "highlights" in CSS;

// 문장 내 오프셋 → DOM Range
function rangeFor(sentence: Element, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(sentence, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  let pos = 0;
  let started = false;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const len = n.data.length;
    if (!started && start <= pos + len) { r.setStart(n, start - pos); started = true; }
    if (started && end <= pos + len) { r.setEnd(n, end - pos); return r; }
    pos += len;
  }
  return null;
}

// 선택 영역 → 문장 단위 오프셋
function offsetsOf(range: Range): Omit<Draft, "x" | "y"> | null {
  const el = (n: Node) => (n.nodeType === 1 ? (n as Element) : n.parentElement);
  const s = el(range.startContainer)?.closest("[data-sid]");
  if (!s) return null;
  const pre = document.createRange();
  pre.selectNodeContents(s);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const total = s.textContent?.length ?? 0;
  const sameSentence = el(range.endContainer)?.closest("[data-sid]") === s;
  let end = total;
  if (sameSentence) {
    pre.setEnd(range.endContainer, range.endOffset);
    end = pre.toString().length;
  }
  if (end <= start) return null;
  return { sid: s.getAttribute("data-sid")!, start, end, quote: (s.textContent ?? "").slice(start, end).trim() };
}

export function AnnotatableArticle({ articleId, body, me, people, initial }: Props) {
  const t = useT();
  const sb = supabaseBrowser();
  const host = useRef<HTMLDivElement>(null);
  const [anns, setAnns] = useState(initial.annotations);
  const [replies, setReplies] = useState(initial.replies);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [online, setOnline] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const blocks = useMemo(() => parseMarkdown(body), [body]);
  const refs = useReferences(body);
  const visible = useMemo(() => anns.filter((a) => showResolved || !a.resolved), [anns, showResolved]);
  const annotated = useMemo(() => new Set(visible.map((a) => a.sentence_id)), [visible]);

  // ─── 하이라이트 렌더 (CSS Custom Highlight API)
  useEffect(() => {
    if (!supportsHighlight() || !host.current) return;
    const groups: Record<string, Range[]> = { gold: [], blue: [], rose: [], sage: [], active: [] };
    for (const a of visible) {
      const s = host.current.querySelector(`[data-sid="${CSS.escape(a.sentence_id)}"]`);
      const r = s && rangeFor(s, a.start_offset, a.end_offset);
      if (r) (a.id === active ? groups.active : groups[a.color]).push(r);
    }
    for (const [k, ranges] of Object.entries(groups)) CSS.highlights.set(`ann-${k}`, new Highlight(...ranges));
    return () => { for (const k of Object.keys(groups)) CSS.highlights.delete(`ann-${k}`); };
  }, [visible, active, blocks]);

  // ─── Realtime 구독 + 접속자 presence
  useEffect(() => {
    const ch = sb
      .channel(`article:${articleId}`, { config: { presence: { key: me.id } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "annotations", filter: `article_id=eq.${articleId}` }, (p) => {
        if (p.eventType === "DELETE") setAnns((xs) => xs.filter((x) => x.id !== (p.old as Annotation).id));
        else {
          const row = p.new as Annotation;
          setAnns((xs) => (xs.some((x) => x.id === row.id) ? xs.map((x) => (x.id === row.id ? row : x)) : [...xs, row]));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "annotation_replies" }, (p) => {
        const row = p.new as AnnotationReply;
        setReplies((xs) => (xs.some((x) => x.id === row.id) ? xs : [...xs, row]));
      })
      .on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState())))
      .subscribe((status) => { if (status === "SUBSCRIBED") ch.track({ name: me.name, at: Date.now() }); });
    return () => { sb.removeChannel(ch); };
  }, [sb, articleId, me.id, me.name]);

  // ─── 선택 감지
  const onPointerUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !host.current) return setDraft(null);
    const range = sel.getRangeAt(0);
    if (!host.current.contains(range.commonAncestorContainer)) return;
    const o = offsetsOf(range);
    if (!o || !o.quote) return setDraft(null);
    const rect = range.getBoundingClientRect();
    const base = host.current.getBoundingClientRect();
    setDraft({ ...o, x: Math.max(0, rect.left - base.left), y: rect.top - base.top - 44 });
  }, []);

  const create = async (color: Color) => {
    if (!draft) return;
    setError(null);
    const { data, error } = await sb
      .from("annotations")
      .insert({ article_id: articleId, sentence_id: draft.sid, start_offset: draft.start, end_offset: draft.end, quote: draft.quote.slice(0, 500), color, author_id: me.id })
      .select()
      .single();
    if (error) return setError(error.message);
    setAnns((xs) => (xs.some((x) => x.id === data.id) ? xs : [...xs, data]));
    if (note.trim()) await reply(data.id, note);
    setNote("");
    setDraft(null);
    setActive(data.id);
    window.getSelection()?.removeAllRanges();
  };

  const reply = async (annotationId: string, text: string) => {
    const { data, error } = await sb.from("annotation_replies").insert({ annotation_id: annotationId, body: text.trim(), author_id: me.id }).select().single();
    if (error) return setError(error.message);
    setReplies((xs) => (xs.some((x) => x.id === data.id) ? xs : [...xs, data]));
  };

  const toggleResolve = async (a: Annotation) => {
    await sb.from("annotations").update({ resolved: !a.resolved }).eq("id", a.id);
  };

  const focus = (a: Annotation) => {
    setActive(a.id);
    host.current?.querySelector(`[data-sid="${CSS.escape(a.sentence_id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // 문서 순서 정렬
  const order = useMemo(() => {
    const ids = blocks.flatMap((b) =>
      b.type === "paragraph" || b.type === "quote" ? b.sentences.map((s) => s.id) : b.type === "list" ? b.items.flat().map((s) => s.id) : [],
    );
    const idx = new Map(ids.map((id, i) => [id, i]));
    return [...visible].sort((a, b) => (idx.get(a.sentence_id) ?? 1e9) - (idx.get(b.sentence_id) ?? 1e9) || a.start_offset - b.start_offset);
  }, [visible, blocks]);

  return (
    <div className="split">
      <div ref={host} className="paper" style={{ position: "relative", padding: "clamp(20px, 4vw, 48px)" }} onPointerUp={onPointerUp}>
        <div className="prose" style={{ maxWidth: "var(--measure)", marginInline: "auto" }}>
          <ArticleBody blocks={blocks} annotated={annotated} references={refs} />
        </div>
        {draft && (
          <div className="ann-pop" style={{ left: draft.x, top: Math.max(0, draft.y) }} onPointerUp={(e) => e.stopPropagation()}>
            {COLORS.map(({ c, v }) => (
              <button key={c} type="button" aria-label={`Highlight ${c}`} onClick={() => create(c)}><span className="sw" style={{ background: v }} /></button>
            ))}
            <input
              className="input"
              style={{ height: 28, padding: "0 8px", fontSize: 12, width: 180 }}
              placeholder={t("코멘트 (Enter)", "Comment (Enter)")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") create("gold"); }}
            />
          </div>
        )}
      </div>

      <aside className="panel" style={{ position: "sticky", top: 80, maxHeight: "calc(100dvh - 100px)", overflow: "auto" }}>
        <div className="panel-head">
          <span className="mono">{t("주석", "Annotations")} ({visible.length})</span>
          <span className="mono" style={{ color: "var(--sage)" }} title={online.map((id) => people[id] ?? id).join(", ")}>● {online.length} live</span>
        </div>
        <p className="panel-note">{t("문장을 선택해 주석 (실시간 공유)", "Select a sentence to annotate (live)")}</p>
        <div className="panel-body stack" style={{ ["--gap" as string]: "18px" }}>
          <label className="mono dim" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved
          </label>
          {error && <p className="error-text">{error}</p>}
          {order.length === 0 && <p className="dim">{t("주석 없음", "No notes yet")}</p>}
          {order.map((a) => (
            <AnnotationItem
              key={a.id}
              a={a}
              active={a.id === active}
              author={people[a.author_id] ?? "—"}
              replies={replies.filter((r) => r.annotation_id === a.id)}
              people={people}
              onFocus={() => focus(a)}
              onReply={(t) => reply(a.id, t)}
              onResolve={() => toggleResolve(a)}
            />
          ))}
        </div>
      </aside>
    </div>
  );
}

function AnnotationItem(props: {
  a: Annotation;
  active: boolean;
  author: string;
  replies: AnnotationReply[];
  people: Record<string, string>;
  onFocus: () => void;
  onReply: (t: string) => void;
  onResolve: () => void;
}) {
  const { a, active, author, replies, people } = props;
  const t = useT();
  const [text, setText] = useState("");
  const color = COLORS.find((c) => c.c === a.color)?.v;
  return (
    <div style={{ borderLeft: `2px solid ${color}`, paddingLeft: 12, opacity: a.resolved ? 0.5 : 1, background: active ? "var(--bg-2)" : undefined }}>
      <button type="button" onClick={props.onFocus} className="serif" style={{ all: "unset", cursor: "pointer", display: "block", fontSize: "0.92rem" }}>
        “{a.quote}”
      </button>
      <div className="mono faint" style={{ marginTop: 4 }}>{author} / {a.created_at.slice(5, 16).replace("T", " ")}</div>
      {replies.map((r) => (
        <p key={r.id} style={{ fontSize: "0.88rem", marginTop: 8 }}><span className="mono dim">{people[r.author_id] ?? "—"}</span> {r.body}</p>
      ))}
      <form
        style={{ display: "flex", gap: 6, marginTop: 8 }}
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) { props.onReply(text); setText(""); } }}
      >
        <input className="input" style={{ height: 30, fontSize: 13 }} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("답글", "Reply")} />
        <button className="btn btn-sm" type="button" onClick={props.onResolve}>{a.resolved ? t("다시 열기", "Reopen") : t("해결", "Resolve")}</button>
      </form>
    </div>
  );
}
