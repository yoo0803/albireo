import { describe, expect, it } from "vitest";
import { buildTree, countDescendants } from "./tree";

describe("buildTree", () => {
  it("중첩 + 깊이 + 고아 처리", () => {
    const rows = [
      { id: "a", parent_id: null, created_at: "1" },
      { id: "b", parent_id: "a", created_at: "2" },
      { id: "c", parent_id: "b", created_at: "3" },
      { id: "d", parent_id: "zzz", created_at: "4" },
    ];
    const t = buildTree(rows);
    expect(t.map((n) => n.id)).toEqual(["a", "d"]);
    expect(t[0].children[0].children[0].depth).toBe(2);
    expect(countDescendants(t[0])).toBe(2);
  });
});
