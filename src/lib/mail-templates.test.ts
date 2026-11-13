import { describe, expect, it } from "vitest";
import { confirmMail, issueMail, joinApprovedMail, joinRequestMail, welcomeMail } from "./mail-templates";

describe("mail templates", () => {
  const site = "https://albireo.test";
  it("확인 메일: 링크 · 존댓말 · 렌즈", () => {
    const m = confirmMail(site, "ko", `${site}/subscribe/confirm?t=x`);
    expect(m.html).toContain("Albireo 웹진을 구독하시겠습니까?");
    expect(m.html).toContain(`${site}/subscribe/confirm?t=x`);
    expect(m.html).toContain(`${site}/mail/albireo-lens.png`);
    expect(m.text).toContain("무시하셔도 됩니다");
  });
  it("환영 · 알림: 해지 링크, 제목 이스케이프", () => {
    expect(welcomeMail(site, "en", `${site}/u`).html).toContain(`${site}/about`);
    const m = issueMail(site, "ko", { slug: "a", title: "<b>x</b>", title_en: null, excerpt: null, excerpt_en: null, author: "S" }, `${site}/u`);
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(m.html).toContain(`${site}/u`);
  });
  it("가입 신청 · 승인: 검토 링크, 신청 내용 이스케이프", () => {
    const m = joinRequestMail(site, { name: "<i>N</i>", email: "n@x.co", field: null, note: "hi" }, `${site}/join/review?t=x`);
    expect(m.html).toContain(`${site}/join/review?t=x`);
    expect(m.html).not.toContain("<i>N</i>");
    expect(m.text).toContain("n@x.co");
    expect(joinApprovedMail(site, "ko", `${site}/login?mode=link`).html).toContain("로그인 링크 받기");
  });
});
