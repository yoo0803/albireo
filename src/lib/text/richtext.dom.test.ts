// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { htmlToMd, mdToHtml } from "./richtext";

const roundTrip = (md: string) => {
  const el = document.createElement("div");
  el.innerHTML = mdToHtml(md);
  return htmlToMd(el);
};

describe("htmlToMd", () => {
  it("왕복 보존", () => {
    const md = "## 소제목\n\n**굵게** 와 *기울임* [링크](https://a.b) [[개념|표시]] 문장[^1].\n\n- 하나\n- 둘\n\n> 인용\n\n[^1]: 각주 내용";
    expect(roundTrip(md)).toBe(md);
  });
  it("브라우저 편집 구조 (div 줄바꿈 · span)", () => {
    const el = document.createElement("div");
    el.innerHTML = "첫 줄<div>둘째 <b>굵게</b></div><div><span>셋째</span></div>";
    expect(htmlToMd(el)).toBe("첫 줄\n\n둘째 **굵게**\n\n셋째");
  });
  it("위험 링크 → 텍스트", () => {
    const el = document.createElement("div");
    el.innerHTML = '<p><a href="javascript:alert(1)">x</a></p>';
    expect(htmlToMd(el)).toBe("x");
  });
});

describe("확장 서식", () => {
  it("밑줄 · 취소선 · 형광 · 들여쓰기 · 표 왕복", () => {
    const md = "++밑줄++ ~~취소~~ ==형광==\n\n>> 들여쓴 문단\n\n| 항목 | 값 |\n| --- | ---: |\n| A | 1 |\n| B | 2 |";
    expect(roundTrip(md)).toBe(md);
  });
});

describe("블록 미리보기", () => {
  it("차트 · 다이어그램 왕복", () => {
    const md = "앞 문단\n\n```chart\ntype: bar\nk,v\na,1\n```\n\n```diagram\nA -> B : 설명\n```";
    expect(roundTrip(md)).toBe(md);
  });
});
