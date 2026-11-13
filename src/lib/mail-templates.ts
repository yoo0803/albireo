import { WELCOME } from "@/content/about";

// 메일 본문 (순수 함수 · 미리보기 · 테스트용)
export type Lang = "ko" | "en";
export type Mail = { subject: string; text: string; html: string };
export type Issue = { slug: string; title: string; title_en: string | null; excerpt: string | null; excerpt_en: string | null; author: string };

const GOLD = "#c08a1f", BLUE = "#2c5aa0", INK = "#1c1a16", MUTED = "#8a8270";
// 본문 서체: 기기 기본 고딕 (메일 앱은 웹폰트 미지원)
const SANS = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR','Helvetica Neue',Arial,sans-serif";
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// 틀: 흰 바탕 · 금빛→푸른빛 테두리 · 렌즈 그림
function frame(site: string, body: string, foot: string) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;padding:32px 14px;font-family:${SANS};color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
<tr><td style="padding:2px;border-radius:14px;background-color:#76725f;background-image:linear-gradient(135deg,${GOLD} 0%,#8f8a5c 48%,${BLUE} 100%)">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px">
<tr><td align="center" style="padding:36px 32px 6px"><img src="${site}/mail/albireo-lens.png" width="132" height="132" alt="" style="display:block;border:0;width:132px;height:132px"></td></tr>
<tr><td align="center" style="padding:6px 32px 4px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-style:italic;letter-spacing:-0.3px">Albi<span style="color:#6d2b5b">reo</span></td></tr>
<tr><td align="center" style="padding:0 32px 24px;font-family:${SANS};font-size:10px;letter-spacing:3px;color:${MUTED}">β CYGNI · PEER-REVIEWED WEBZINE</td></tr>
<tr><td style="padding:0 36px 30px;font-size:15px;line-height:1.8;letter-spacing:-0.1px">${body}</td></tr>
<tr><td align="center" style="padding:16px 36px 22px;border-top:1px solid #eeeae0;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED}">${foot}</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 6px"><tr><td style="border-radius:999px;background-color:${INK}"><a href="${href}" style="display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-family:${SANS};font-size:14px;letter-spacing:0.5px">${esc(label)}</a></td></tr></table>`;
const h1 = (s: string) => `<h1 style="margin:0 0 14px;font-size:21px;line-height:1.45;font-weight:600;letter-spacing:-0.4px;text-align:center;word-break:keep-all">${esc(s)}</h1>`;
const p = (s: string, style = "") => `<p style="margin:0 0 14px;word-break:keep-all;${style}">${esc(s)}</p>`;
const small = `text-align:center;font-size:12.5px;line-height:1.7;color:${MUTED}`;
// 줄을 정해서 끊기 (각 줄 이스케이프)
const lines = (ls: string[], style = "") => `<p style="margin:0 0 14px;word-break:keep-all;${style}">${ls.map(esc).join("<br>")}</p>`;
const unsubLink = (href: string, en: boolean) => `<a href="${href}" style="color:${MUTED}">${en ? "Unsubscribe" : "구독 해지"}</a>`;

// 구독 확인
export function confirmMail(site: string, lang: Lang, url: string): Mail {
  const en = lang === "en";
  const q = en ? "Would you like to subscribe to Albireo?" : "Albireo 웹진을 구독하시겠습니까?";
  const lead = en ? "We will email you whenever a new article is published." : "새 글이 발행되면 메일로 알려 드리겠습니다.";
  const how = en ? ["Cancel anytime with ‘Unsubscribe’", "at the bottom of every notification email."] : ["구독은 알림 메일 하단의 ‘구독 해지’로", "언제든지 취소하실 수 있습니다."];
  const ignore = en ? "If you did not request this, you can safely ignore this email." : "구독을 신청하신 적이 없다면 이 메일은 무시하셔도 됩니다.";
  return {
    subject: en ? "Confirm your Albireo subscription" : "Albireo 구독 확인",
    text: `${q}\n${lead}\n\n${en ? "Confirm" : "구독 확인"}: ${url}\n\n${how.join(" ")}\n${ignore}`,
    html: frame(site, h1(q) + p(lead, "text-align:center") + button(url, en ? "Confirm subscription" : "구독 확인") + lines(how, `margin-top:20px;${small}`), esc(ignore)),
  };
}

// 구독 완료 환영
export function welcomeMail(site: string, lang: Lang, unsub: string): Mail {
  const w = WELCOME[lang];
  const en = lang === "en";
  const about = `${site}/about`;
  return {
    subject: w.subject,
    text: `${w.title}\n\n${w.body.join("\n\n")}\n\n${w.more}: ${about}\n\n${en ? "Unsubscribe" : "구독 해지"}: ${unsub}`,
    html: frame(site, h1(w.title) + w.body.map((b) => lines(b.split("\n"))).join("") + button(about, w.more), unsubLink(unsub, en)),
  };
}

// 새 글 알림
export function issueMail(site: string, lang: Lang, a: Issue, unsub: string): Mail {
  const L = lang === "en";
  const useEn = L && !!a.title_en;
  const title = useEn ? a.title_en! : a.title;
  const excerpt = (useEn ? a.excerpt_en : a.excerpt) ?? "";
  const url = `${site}/articles/${a.slug}`;
  return {
    subject: `${L ? "New on Albireo" : "Albireo 새 글"} · ${title}`,
    text: `${title}\n${a.author}\n\n${excerpt}\n\n${url}\n\n${L ? "Unsubscribe" : "구독 해지"}: ${unsub}`,
    html: frame(
      site,
      `<p style="margin:0 0 8px;text-align:center;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${MUTED}">${L ? "New article" : "새 글"} · ${esc(a.author)}</p>${h1(title)}${excerpt ? p(excerpt, "color:#4a4538;text-align:center") : ""}${button(url, L ? "Read the article" : "글 읽기")}`,
      unsubLink(unsub, L),
    ),
  };
}

// 가입 신청 → 관리자 (승인 · 거절은 검토 화면에서)
export type JoinReq = { name: string; email: string; field: string | null; note: string | null };
export function joinRequestMail(site: string, r: JoinReq, review: string): Mail {
  const row = (k: string, v: string) => `<tr><td style="padding:6px 0;width:72px;vertical-align:top;font-size:12px;letter-spacing:1px;color:${MUTED}">${k}</td><td style="padding:6px 0;font-size:14.5px;word-break:break-all">${esc(v)}</td></tr>`;
  const info = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px;border-top:1px solid #eeeae0;border-bottom:1px solid #eeeae0">${row("이름", r.name)}${row("메일", r.email)}${r.field ? row("분야", r.field) : ""}${r.note ? row("메모", r.note) : ""}</table>`;
  return {
    subject: `Albireo 멤버 가입 신청 · ${r.name}`,
    text: `새 멤버 가입 신청이 도착했습니다.\n\n이름: ${r.name}\n메일: ${r.email}${r.field ? `\n분야: ${r.field}` : ""}${r.note ? `\n메모: ${r.note}` : ""}\n\n검토하기: ${review}\n\n승인은 검토 화면에서 관리자 로그인 후 진행됩니다.`,
    html: frame(site, h1("새 멤버 가입 신청이 도착했습니다.") + info + button(review, "검토하기") + p("승인 · 거절은 검토 화면에서 관리자 로그인 후 진행됩니다.", `margin-top:16px;${small}`), "이 신청은 7일 뒤 만료됩니다."),
  };
}

// 가입 승인 → 신청자
export function joinApprovedMail(site: string, lang: Lang, login: string): Mail {
  const en = lang === "en";
  const title = en ? "Welcome to Albireo." : "Albireo 멤버로 승인되었습니다.";
  const how = en
    ? ["On the sign-in page, choose ‘Email me a sign-in link’", "and set your password in Settings."]
    : ["로그인 화면에서 ‘로그인 링크 받기’로 처음 로그인하신 뒤", "Settings에서 비밀번호를 정해 주십시오."];
  return {
    subject: en ? "Your Albireo membership is approved" : "Albireo 멤버 가입이 승인되었습니다",
    text: `${title}\n\n${how.join(" ")}\n\n${login}`,
    html: frame(site, h1(title) + lines(how, "text-align:center") + button(login, en ? "Go to sign in" : "로그인하러 가기"), en ? "Each in our own orbit, forward together." : "각자의 궤도에서, 함께 앞으로."),
  };
}
