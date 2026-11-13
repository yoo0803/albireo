"use client";
import { useEffect, useState, useTransition } from "react";
import { submitReview } from "@/app/studio/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { REVIEW_CHECKLIST } from "@/content/review-guideline";
import { PeerReviewStamp } from "@/components/article/PeerReviewStamp";
import type { PeerReview, ReviewVerdict } from "@/types/database";
import { useT } from "@/lib/i18n/client";

type Props = {
  articleId: string;
  meId: string;
  required: number;
  people: Record<string, string>;
  initial: PeerReview[];
  reviewed: boolean;
};

// 피어리뷰: 가이드라인 체크리스트 + 판정
export function ReviewPanel({ articleId, meId, required, people, initial, reviewed }: Props) {
  const t = useT();
  const [reviews, setReviews] = useState(initial);
  const mine = reviews.find((r) => r.reviewer_id === meId);
  const [checks, setChecks] = useState<Record<string, boolean>>((mine?.checklist as Record<string, boolean>) ?? {});
  const [note, setNote] = useState(mine?.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`reviews:${articleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "peer_reviews", filter: `article_id=eq.${articleId}` }, (p) => {
        if (p.eventType === "DELETE") {
          const o = p.old as Partial<PeerReview>;
          setReviews((xs) => xs.filter((x) => x.reviewer_id !== o.reviewer_id));
        } else {
          const row = p.new as PeerReview;
          setReviews((xs) => [...xs.filter((x) => x.reviewer_id !== row.reviewer_id), row]);
        }
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [articleId]);

  const approvals = reviews.filter((r) => r.verdict === "approve").length;
  const allChecked = REVIEW_CHECKLIST.every((c) => checks[c.id]);

  const send = (verdict: ReviewVerdict) =>
    start(async () => {
      const r = await submitReview(articleId, verdict, checks, note);
      setMsg(r.ok ? t("제출됨", "Submitted") : r.error);
    });

  return (
    <div className="split">
      <div className="panel">
        <div className="panel-head"><span className="mono">{t("검수 기준 체크리스트", "Guideline checklist")}</span></div>
        <p className="panel-note">{t("승인 전 확인 6항목", "Six checks before approving")}</p>
        <div className="panel-body stack" style={{ ["--gap" as string]: "14px" }}>
          {REVIEW_CHECKLIST.map((c) => (
            <label key={c.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={!!checks[c.id]} onChange={(e) => setChecks((x) => ({ ...x, [c.id]: e.target.checked }))} />
              <span><b>{t(c.label, c.labelEn)}</b><br /><span className="dim" style={{ fontSize: "0.88rem" }}>{t(c.desc, c.descEn)}</span></span>
            </label>
          ))}
          <div className="field">
            <label htmlFor="note">{t("검수 의견", "Reviewer note")}</label>
            <textarea id="note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-gold" disabled={!allChecked || pending} onClick={() => send("approve")} title={allChecked ? "" : t("모든 항목 체크 필요", "Tick every item")}>{t("승인", "Approve")}</button>
            <button className="btn" disabled={pending} onClick={() => send("request_changes")}>{t("수정 요청", "Request changes")}</button>
          </div>
          {msg && <p className="mono dim">{msg}</p>}
        </div>
      </div>

      <aside className="panel">
        <div className="panel-head"><span className="mono">{t("현황", "Status")}</span><span className="mono dim">{approvals}/{required}</span></div>
        <p className="panel-note">{t("멤버별 검수 현황", "Review status by member")}</p>
        <div className="panel-body stack" style={{ ["--gap" as string]: "16px", justifyItems: "start" }}>
          <PeerReviewStamp reviewed={reviewed || approvals >= required} count={approvals} required={required} />
          {reviews.map((r) => (
            <div key={r.reviewer_id} style={{ fontSize: "0.9rem" }}>
              <span className="mono" style={{ color: r.verdict === "approve" ? "var(--sage)" : "var(--rose)" }}>{r.verdict === "approve" ? "✓" : "✕"}</span>{" "}
              {people[r.reviewer_id] ?? "—"}
              {r.note && <p className="dim" style={{ marginTop: 4 }}>{r.note}</p>}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
