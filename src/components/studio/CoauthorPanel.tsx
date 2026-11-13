"use client";
import { useState, useTransition } from "react";
import { removeCoauthor, setCoauthor } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";

type Member = { id: string; display_name: string };
type Props = { articleId: string; authorId: string; members: Member[]; initial: { profile_id: string; contribution: string | null }[] };

// 공저자 · 기여 지정
export function CoauthorPanel({ articleId, authorId, members, initial }: Props) {
  const t = useT();
  const [rows, setRows] = useState(initial);
  const [pick, setPick] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = (id: string) => members.find((m) => m.id === id)?.display_name ?? "—";
  const candidates = members.filter((m) => m.id !== authorId && !rows.some((r) => r.profile_id === m.id));

  const add = () =>
    start(async () => {
      if (!pick) return;
      const r = await setCoauthor(articleId, pick, note);
      if (!r.ok) return setErr(r.error);
      setRows((x) => [...x, { profile_id: pick, contribution: note || null }]);
      setPick("");
      setNote("");
    });

  const remove = (id: string) =>
    start(async () => {
      const r = await removeCoauthor(articleId, id);
      if (!r.ok) return setErr(r.error);
      setRows((x) => x.filter((y) => y.profile_id !== id));
    });

  return (
    <div className="panel">
      <div className="panel-head"><span className="mono">Co-authors</span></div>
      <p className="panel-note">{t("공저자 지정 · 기여 표기", "Add co-authors · credit contributions")}</p>
      <div className="panel-body stack">
        {rows.map((r) => (
          <div key={r.profile_id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{name(r.profile_id)} <span className="dim">{r.contribution}</span></span>
            <button className="btn btn-sm btn-ghost" onClick={() => remove(r.profile_id)} disabled={pending}>×</button>
          </div>
        ))}
        {candidates.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <select className="select" style={{ width: "auto" }} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Member">
              <option value="">—</option>
              {candidates.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
            <input className="input" style={{ flex: "1 1 120px" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("기여", "Contribution")} maxLength={80} />
            <button className="btn btn-sm" onClick={add} disabled={!pick || pending}>Add</button>
          </div>
        )}
        {err && <p className="error-text">{err}</p>}
      </div>
    </div>
  );
}
