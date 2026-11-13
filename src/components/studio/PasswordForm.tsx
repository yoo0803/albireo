"use client";
import { useActionState } from "react";
import { setPassword, type PwState } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";

// 비밀번호 설정 · 변경
export function PasswordForm({ email }: { email: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<PwState, FormData>(setPassword, null);
  return (
    <form action={action} className="panel-body stack">
      {/* 비밀번호 관리자용 계정 칸 */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="field"><label htmlFor="pw1">{t("새 비밀번호 (8자 이상, 영문과 숫자)", "New password (8+ / letters and digits)")}</label><input id="pw1" name="password" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={72} required /></div>
      <div className="field"><label htmlFor="pw2">{t("비밀번호 확인", "Confirm password")}</label><input id="pw2" name="password2" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={72} required /></div>
      <button className="btn btn-gold btn-start" disabled={pending}>{pending ? t("저장 중…", "Saving…") : t("비밀번호 저장", "Save password")}</button>
      {state && <p className={state.ok ? "dim" : "error-text"} role="status">{state.msg}</p>}
    </form>
  );
}
