"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLogin, decideLogin } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";
import type { ProfileLogin } from "@/types/database";

type Row = Pick<ProfileLogin, "user_id" | "status" | "email" | "note" | "created_at">;

// 이 프로필에 연결된 로그인 계정: 승인 · 거절 · 해제
export function LoginAccounts({ me, owner, rows }: { me: string; owner: boolean; rows: Row[] }) {
  const t = useT();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const act = (id: string, d: "approved" | "declined" | "remove") =>
    start(async () => {
      setErr(null);
      const r = await decideLogin(id, d);
      if (!r.ok) setErr(r.error);
      router.refresh();
    });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setErr(null); setOk(null);
      const r = await addLogin(email);
      if (!r.ok) { setErr(r.error); return; }
      setOk(t(`${email} 계정을 추가했습니다. 로그인 화면에서 이 메일로 로그인 링크를 받아 들어오면 됩니다.`, `Added ${email}. Sign in with an email link to this address.`));
      setEmail("");
      router.refresh();
    });
  };

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
      <form onSubmit={add} className="login-add">
        <label htmlFor="la" className="label faint">{t("계정 추가", "Add an account")}</label>
        <div className="login-add-row">
          <input id="la" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" maxLength={200} />
          <button className="btn btn-gold" disabled={pending || !email}>{pending ? "…" : t("추가", "Add")}</button>
        </div>
        <span className="faint" style={{ fontSize: "0.8rem" }}>{t("여기서 추가한 메일은 별도 승인 없이 바로 이 프로필로 로그인할 수 있습니다.", "Emails added here can sign in to this profile right away, no approval needed.")}</span>
      </form>
      {ok && <p className="ok-text">{ok}</p>}
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}
