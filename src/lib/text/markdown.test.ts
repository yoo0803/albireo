import { describe, expect, it } from "vitest";
import { footnoteOrder, parseInline, parseMarkdown, safeHref } from "./markdown";
import { extractTerms } from "./wikilink";

describe("markdown", () => {
  it("문단 → 문장 분할 + 고유 id", () => {
    const [p] = parseMarkdown("첫 문장이다. 두 번째 문장이다. 첫 문장이다.");
    expect(p.type).toBe("paragraph");
    if (p.type !== "paragraph") return;
    expect(p.sentences).toHaveLength(3);
    expect(new Set(p.sentences.map((s) => s.id)).size).toBe(3);
  });
  it("위키링크 파싱", () => {
    const nodes = parseInline("[[엔트로피|무질서도]]는 증가한다");
    expect(nodes[0]).toEqual({ t: "wiki", term: "엔트로피", label: "무질서도" });
  });
  it("javascript: 링크 차단", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(parseInline("[x](javascript:alert(1))")[0].t).toBe("text");
  });
  it("개념어 추출 중복 제거", () => {
    expect(extractTerms("[[RLS]] 와 [[rls]] 그리고 [[SM-2]]")).toEqual(["rls", "SM-2"]);
  });
});

describe("각주", () => {
  it("참조 순서 번호 · 정의 블록 분리", () => {
    const blocks = parseMarkdown("둘째[^b] 그리고 첫째[^a].\n\n[^a]: 에이\n[^b]: 비");
    expect(blocks.filter((b) => b.type === "paragraph")).toHaveLength(1);
    expect(footnoteOrder(blocks).map((n) => [n.id, n.n])).toEqual([["b", 1], ["a", 2]]);
  });
  it("인라인 각주 참조", () => {
    expect(parseInline("문장[^1]")).toEqual([{ t: "text", v: "문장" }, { t: "fnref", id: "1" }]);
  });
});

describe("표 · 차트 · 다이어그램", () => {
  it("표 파싱", () => {
    const [t] = parseMarkdown("| a | b |\n|:---:|---:|\n| 1 | 2 |");
    expect(t).toEqual({ type: "table", head: ["a", "b"], align: ["center", "right"], rows: [["1", "2"]] });
  });
});
