"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideLogin } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";
import type { ProfileLogin } from "@/types/database";

type Row = Pick<ProfileLogin, "user_id" | "status" | "email" | "note" | "created_at">;

// 이 프로필에 연결된 로그인 계정: 승인 · 거절 · 해제
export function LoginAccounts({ me, owner, rows }: { me: string; owner: boolean; rows: Row[] }) {
  const t = useT();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (id: string, d: "approved" | "declined" | "remove") =>
    start(async () => {
      setErr(null);
      const r = await decideLogin(id, d);
      if (!r.ok) setErr(r.error);
      router.refresh();
    });

  const waiting = rows.filter((r) => r.status === "pending");
  const linked = rows.filter((r) => r.status === "approved");

  return (
    <div className="panel-body stack">
      <div className="login-row">
        <span>{me}</span>
        <span className="mono faint">{owner ? t("기본 계정 (지금 사용 중)", "Main account (current)") : t("연결 계정 (지금 사용 중)", "Linked account (current)")}</span>
      </div>
      {linked.map((r) => (
        <div key={r.user_id} className="login-row">
          <span>{r.email ?? "—"}</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="mono faint">{t("연결됨", "Linked")}</span>
            <button className="btn btn-sm btn-ghost" disabled={pending} onClick={() => act(r.user_id, "remove")}>{t("해제", "Unlink")}</button>
          </span>
        </div>
      ))}
      {waiting.length > 0 && <p className="label faint">{t("승인 대기", "Waiting for approval")}</p>}
      {waiting.map((r) => (
        <div key={r.user_id} className="login-row">
          <span>
            {r.email ?? "—"}
            {r.note && <span className="dim" style={{ display: "block", fontSize: "0.85rem" }}>“{r.note}”</span>}
          </span>
          <span style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-sm btn-gold" disabled={pending} onClick={() => act(r.user_id, "approved")}>{t("승인", "Approve")}</button>
            <button className="btn btn-sm" disabled={pending} onClick={() => act(r.user_id, "declined")}>{t("거절", "Decline")}</button>
          </span>
        </div>
      ))}
      {!linked.length && !waiting.length && <p className="dim" style={{ fontSize: "0.88rem" }}>{t("연결된 다른 계정이 없습니다.", "No other accounts linked.")}</p>}
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}
