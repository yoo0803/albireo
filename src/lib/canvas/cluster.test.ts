import { describe, expect, it } from "vitest";
import { cluster } from "./cluster";

describe("cluster", () => {
  const mk = (p: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, w: 150 + (i % 3) * 20, h: 190 }));
  const groups = [{ id: "a", label: { id: "la", w: 160, h: 50 }, items: mk("a", 7) }, { id: "b", items: mk("b", 6) }, { id: "c", items: mk("c", 5) }];
  const opts = { w: 2600, h: 1900, seed: "x" };

  it("결정적 · 단위 안 · 겹침 없음", () => {
    const a = cluster({ id: "hero", w: 520, h: 300 }, groups, opts);
    expect(a).toEqual(cluster({ id: "hero", w: 520, h: 300 }, groups, opts));
    expect(a).toHaveLength(1 + 1 + 18);
    for (const p of a) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(opts.w);
      expect(p.y + p.h).toBeLessThanOrEqual(opts.h);
    }
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++) {
        const [p, q] = [a[i], a[j]];
        expect(p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h).toBe(false);
      }
  });

  it("hero 중앙", () => {
    const [h] = cluster({ id: "hero", w: 520, h: 300 }, groups, opts);
    expect(h.x + h.w / 2).toBe(1300);
    expect(h.y + h.h / 2).toBe(950);
  });
});
