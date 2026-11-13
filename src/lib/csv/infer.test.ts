import { describe, expect, it } from "vitest";
import { inferColumns, suggestChart } from "./infer";

describe("csv infer", () => {
  it("날짜 + 수치 → line", () => {
    const rows = [
      { date: "2026-01-01", pH: "7.1", temp: "21" },
      { date: "2026-01-02", pH: "7.3", temp: "22" },
    ];
    const cols = inferColumns(rows);
    expect(cols.map((c) => c.type)).toEqual(["date", "number", "number"]);
    expect(suggestChart(cols)).toEqual({ kind: "line", x: "date", y: ["pH", "temp"] });
  });
  it("단조 수치 x → line", () => {
    const rows = [{ t: "0", v: "1" }, { t: "10", v: "2" }, { t: "20", v: "4" }];
    expect(suggestChart(inferColumns(rows), rows)).toEqual({ kind: "line", x: "t", y: ["v"] });
  });
  it("범주 + 수치 → bar", () => {
    const cols = inferColumns([{ solvent: "EtOH", yield: "81" }, { solvent: "MeOH", yield: "77" }]);
    expect(suggestChart(cols)?.kind).toBe("bar");
  });
});
