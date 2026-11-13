import { describe, expect, it } from "vitest";
import { sortArticles } from "./sort";

const xs = [
  { id: "a", published_at: "2026-01-01", popularity: 3 },
  { id: "b", published_at: "2026-03-01", popularity: 1 },
  { id: "c", published_at: "2026-02-01", popularity: 9 },
];

describe("sortArticles", () => {
  it("최신 · 오래된 · 인기", () => {
    expect(sortArticles(xs, "latest").map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect(sortArticles(xs, "oldest").map((x) => x.id)).toEqual(["a", "c", "b"]);
    expect(sortArticles(xs, "popular").map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});
