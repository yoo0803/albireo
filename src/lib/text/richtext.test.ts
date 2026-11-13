import { describe, expect, it } from "vitest";
import { mdToHtml } from "./richtext";

describe("일반 작성 변환", () => {
  it("서식 · 원문 토큰 유지 · 이스케이프", () => {
    const html = mdToHtml("## 제목\n\n**굵게** [[개념]] 문장[^1] <script>\n\n[^1]: 주석");
    expect(html).toContain("<h2>제목</h2>");
    expect(html).toContain("<b>굵게</b>");
    expect(html).toContain("[[개념]]");
    expect(html).toContain("[^1]");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
  it("위험 링크 제거", () => {
    expect(mdToHtml("[x](javascript:alert(1))")).not.toContain("href");
  });
});
