"use client";
import { useActionState, useState } from "react";
import { requestMembership, sendMagicLink, signInWithPassword, type JoinState, type LoginState } from "./actions";
import { useT } from "@/lib/i18n/client";

// 로그인: 비밀번호 (기본) · 로그인 링크 (등록된 메일) · 멤버 가입 신청 (관리자 승인)
type Mode = "password" | "link" | "join";

export function LoginForm({ next, initial = "password" }: { next: string; initial?: Mode }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initial);
  const [pw, pwAction, pwPending] = useActionState<LoginState, FormData>(signInWithPassword, { status: "idle" });
  const [link, linkAction, linkPending] = useActionState<LoginState, FormData>(sendMagicLink, { status: "idle" });
  const [join, joinAction, joinPending] = useActionState<JoinState, FormData>(requestMembership, null);

  const back = <button type="button" className="login-back" onClick={() => setMode("password")}>← {t("비밀번호로 로그인", "Sign in with password")}</button>;

  if (mode === "link") {
    return (
      <form action={linkAction} className="stack">
        <input type="hidden" name="next" value={next} />
        <p className="login-sub">{t("비밀번호를 잊으셨거나 처음 로그인하신다면, 등록된 메일로 로그인 링크를 보내 드립니다.", "Forgot your password or signing in for the first time? We’ll send a sign-in link to your registered email.")}</p>
        <div className="field">
          <label htmlFor="email-link" className="label-row">Email{link.field === "email" && <span className="field-err" role="alert">{link.message}</span>}</label>
          <input id="email-link" name="email" type="email" required autoComplete="email" className="input" placeholder="you@albireo.dev" />
        </div>
        <button className="btn btn-gold" disabled={linkPending}>{linkPending ? t("보내는 중…", "Sending…") : t("로그인 링크 받기", "Email me a sign-in link")}</button>
        {link.status === "sent" && <p className="dim login-msg">{t("로그인 링크를 보내 드렸습니다. 로그인 후 Settings에서 비밀번호를 정할 수 있습니다.", "A sign-in link is on its way. After signing in, you can set a password in Settings.")}</p>}
        {link.status === "error" && !link.field && <p className="error-text">{link.message}</p>}
        {back}
      </form>
    );
  }

  if (mode === "join") {
    return (
      <form action={joinAction} className="stack">
        <p className="login-sub">{t("관리자가 승인하면 메일로 안내해 드립니다.", "Your request goes to the admin. We’ll email you once it’s approved.")}</p>
        {join?.ok ? (
          <p className="join-done">{join.msg}</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="join-name">{t("이름", "Name")}</label>
              <input id="join-name" name="name" required maxLength={40} autoComplete="name" className="input" />
            </div>
            <div className="field">
              <label htmlFor="join-email">Email</label>
              <input id="join-email" name="email" type="email" required maxLength={254} autoComplete="email" className="input" placeholder="you@albireo.dev" />
            </div>
            <div className="field">
              <label htmlFor="join-field">{t("분야", "Field")} <span className="faint">{t("(선택)", "(optional)")}</span></label>
              <input id="join-field" name="field" maxLength={40} className="input" placeholder={t("예: English Literature", "e.g. English Literature")} />
            </div>
            <div className="field">
              <label htmlFor="join-note">{t("한마디", "Note")} <span className="faint">{t("(선택)", "(optional)")}</span></label>
              <textarea id="join-note" name="note" maxLength={600} rows={3} className="input login-note" />
            </div>
            {/* 봇 함정 칸 */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" />
            <button className="btn btn-gold" disabled={joinPending}>{joinPending ? t("보내는 중…", "Sending…") : t("가입 신청 보내기", "Send request")}</button>
            {join && !join.ok && <p className="error-text">{join.msg}</p>}
          </>
        )}
        {back}
      </form>
    );
  }

  return (
    <form action={pwAction} className="stack">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input" placeholder="you@albireo.dev" />
      </div>
      <div className="field">
        <label htmlFor="password">{t("비밀번호", "Password")}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" maxLength={128} />
      </div>
      <button className="btn btn-gold" disabled={pwPending}>{pwPending ? t("확인 중…", "Signing in…") : t("로그인", "Sign in")}</button>
      {pw.status === "error" && <p className="error-text">{pw.message}</p>}
      <div className="login-alt">
        <button type="button" className="login-alt-btn" onClick={() => setMode("link")}>
          <b>{t("로그인 링크 받기", "Sign-in link")}</b>
          <span>{t("비밀번호를 잊으셨다면", "Forgot your password?")}</span>
        </button>
        <button type="button" className="login-alt-btn" onClick={() => setMode("join")}>
          <b>{t("멤버 가입 신청", "Request membership")}</b>
          <span>{t("관리자 승인 후 가입", "Approved by the admin")}</span>
        </button>
      </div>
    </form>
  );
}
