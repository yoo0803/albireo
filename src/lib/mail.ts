import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "@/lib/env";
import { absUrl } from "@/lib/seo";
import { confirmMail, issueMail, joinApprovedMail, joinRequestMail, welcomeMail, type Issue, type JoinReq, type Lang } from "@/lib/mail-templates";

// 메일 발송 (Gmail SMTP 등). 미설정 시 null
let cached: Transporter | null | undefined;
export function mailer() {
  if (cached !== undefined) return cached;
  const e = serverEnv();
  cached = e.smtpUser && e.smtpPass
    ? nodemailer.createTransport({ host: e.smtpHost, port: e.smtpPort, secure: e.smtpPort === 465, auth: { user: e.smtpUser, pass: e.smtpPass } })
    : null;
  return cached;
}
export const mailReady = () => !!mailer() && !!serverEnv().serviceKey;
const from = () => {
  const e = serverEnv();
  return e.mailFrom || `Albireo <${e.smtpUser}>`;
};

export type { Issue };
const site = () => absUrl("").replace(/\/$/, "");
// 메일 앱 원클릭 해지 (RFC 8058)
const unsubHeaders = (token: string) => ({ "List-Unsubscribe": `<${absUrl(`/api/unsubscribe?t=${token}`)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });

export async function sendConfirm(to: string, token: string, lang: Lang) {
  const m = mailer();
  if (!m) return false;
  await m.sendMail({ from: from(), to, ...confirmMail(site(), lang, absUrl(`/subscribe/confirm?t=${token}`)) });
  return true;
}

// 구독 완료 환영 메일
export async function sendWelcome(to: string, token: string, lang: Lang) {
  const m = mailer();
  if (!m) return false;
  await m.sendMail({ from: from(), to, headers: unsubHeaders(token), ...welcomeMail(site(), lang, absUrl(`/subscribe/unsubscribe?t=${token}`)) });
  return true;
}

export async function sendIssue(to: string, token: string, lang: Lang, a: Issue) {
  const m = mailer();
  if (!m) return false;
  await m.sendMail({ from: from(), to, headers: unsubHeaders(token), ...issueMail(site(), lang, a, absUrl(`/subscribe/unsubscribe?t=${token}`)) });
  return true;
}

// 가입 신청 알림 (관리자)
export async function sendJoinRequest(r: JoinReq, token: string) {
  const m = mailer();
  const to = serverEnv().adminEmail;
  if (!m || !to) return false;
  await m.sendMail({ from: from(), to, replyTo: r.email, ...joinRequestMail(site(), r, absUrl(`/join/review?t=${token}`)) });
  return true;
}

// 가입 승인 안내 (신청자)
export async function sendJoinApproved(to: string, lang: Lang) {
  const m = mailer();
  if (!m) return false;
  await m.sendMail({ from: from(), to, ...joinApprovedMail(site(), lang, absUrl("/login?mode=link")) });
  return true;
}
