"use client";
import { useActionState } from "react";
import { subscribe, type SubState } from "@/app/(site)/subscribe/actions";
import { useT } from "@/lib/i18n/client";

// 새 글 메일 구독 (작은 띠)
export function SubscribeForm({ id = "sub" }: { id?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<SubState, FormData>(subscribe, null);
  return (
    <form action={action} className="subscribe">
      <label className="subscribe-lead" htmlFor={`${id}-email`}>
        <span className="label">Letters</span>
        {t("새 글이 발행되면 메일 받기", "Get new pieces by email")}
      </label>
      <div className="subscribe-row">
        <input id={`${id}-email`} className="input" type="email" name="email" required maxLength={254} autoComplete="email" placeholder={t("메일 주소", "you@example.com")} disabled={pending || state?.ok} />
        {/* 봇 함정 칸 */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
        <button className="btn" disabled={pending || state?.ok}>{pending ? "…" : t("구독", "Subscribe")}</button>
      </div>
      {state && <p className={`subscribe-msg ${state.ok ? "" : "err"}`} role="status">{state.msg}</p>}
    </form>
  );
}
