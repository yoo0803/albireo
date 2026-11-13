import { describe, expect, it } from "vitest";
import { layoutDiagram, parseChartBlock, parseDiagram } from "./blocks";

describe("blocks", () => {
  it("차트 옵션", () => {
    expect(parseChartBlock("type: pie\ntitle: 비율\nk,v\na,1")).toEqual({ kind: "pie", title: "비율", csv: "k,v\na,1" });
  });
  it("다이어그램 단계", () => {
    const d = parseDiagram("direction: down\n수집 -> 정제 : 전처리\n정제 -> 분석\n수집 -> 분석\n메모");
    expect(d.dir).toBe("down");
    expect(d.edges).toHaveLength(3);
    expect(layoutDiagram(d)).toEqual([["수집", "메모"], ["정제"], ["분석"]]);
  });
});
