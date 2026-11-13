"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { setPublic } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";

type Props = { id: string; slug: string; isPublic: boolean; reviewed: boolean; required: number };

// is_public 원클릭 토글
export function PublishPanel({ id, slug, isPublic, reviewed, required }: Props) {
  const t = useT();
  const [on, setOn] = useState(isPublic);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  

  const toggle = () =>
    start(async () => {
      setErr(null);
      const r = await setPublic(id, !on);
      if (r.ok) setOn(!on);
      else setErr(r.error);
    });

  return (
    <div className="panel">
      <div className="panel-head"><span className="mono">Publish</span><span className="mono" style={{ color: on ? "var(--sage)" : "var(--fg-faint)" }}>{on ? "● public" : "○ private"}</span></div>
      <p className="panel-note">{t("공개 상태 · 검수 인증 여부", "Visibility · review status")}</p>
      <div className="panel-body stack">
        {on ? (
          <button className="btn" onClick={toggle} disabled={pending}>{pending ? "…" : "Unpublish"}</button>
        ) : (
          <p className="dim" style={{ fontSize: "0.86rem" }}>{t("Write 탭에서 Publish", "Publish from the Write tab")}</p>
        )}
        {on && <p className="dim" style={{ fontSize: "0.86rem" }}>{reviewed ? "◉ Peer-Reviewed" : t(`검수 대기 · ${required}인 승인 시 자동 인증`, `Review pending · certified at ${required} approvals`)}</p>}
        {on && <Link href={`/articles/${slug}`} className="mono" style={{ color: "var(--gold)" }} target="_blank">/articles/{slug} ↗</Link>}
        {err && <p className="error-text">{err}</p>}
      </div>
    </div>
  );
}
