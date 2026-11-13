import { describe, expect, it } from "vitest";
import { autoArrange, radial, canNest, dateKey, inPoly, layout, migrate, mindmap, nest, simplify, steady, timetree, wrap, type Board, type Item } from "./model";

const m = (s: string, size: number) => s.length * size * 0.6;
const it_ = (id: string, p: Partial<Item> = {}): Item => ({ id, shape: "card", x: 0, y: 0, w: 200, h: 64, text: id, tone: "gold", ...p });

describe("board model", () => {
  it("줄바꿈: 폭 안에서 끊고, 긴 단어는 글자 단위", () => {
    expect(wrap("aaaa bbbb cccc", 40, 10, m)).toEqual(["aaaa", "bbbb", "cccc"]);
    expect(wrap("abcdefghij", 30, 10, m).length).toBeGreaterThan(1);
    expect(wrap("a\n\nb", 100, 10, m)).toEqual(["a", "", "b"]);
  });
  it("넣기: 자기 자신 · 후손 · 비컨테이너 금지", () => {
    const items = [it_("a"), it_("b", { parent: "a" }), it_("c", { shape: "ellipse" })];
    expect(canNest(items, "a", "b")).toBe(false);
    expect(canNest(items, "a", "c")).toBe(false);
    expect(canNest(items, "c", "a")).toBe(true);
    expect(nest(items, "a", "b")).toBe(items);
    expect(nest(items, "c", "a").find((i) => i.id === "c")!.parent).toBe("a");
  });
  it("배치: 펼친 카드는 자식 높이만큼 커지고, 접히면 자식 숨김", () => {
    const items = [it_("a", { x: 10, y: 10 }), it_("b", { parent: "a" }), it_("c", { parent: "a" })];
    const open = layout(items, m);
    expect(open.get("a")!.h).toBeGreaterThan(64 * 2);
    expect(open.get("b")!.hidden).toBe(false);
    expect(open.get("c")!.y).toBeGreaterThan(open.get("b")!.y);
    const shut = layout(items.map((i) => (i.id === "a" ? { ...i, collapsed: true } : i)), m);
    expect(shut.get("b")!.hidden).toBe(true);
    const folder = layout([it_("f", { shape: "folder" }), it_("x", { parent: "f" })], m);
    expect(folder.get("x")!.hidden).toBe(true);
  });
  it("올가미 판정", () => {
    const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(inPoly({ x: 5, y: 5 }, sq)).toBe(true);
    expect(inPoly({ x: 15, y: 5 }, sq)).toBe(false);
  });
  it("획 단순화 · 보정", () => {
    const line = Array.from({ length: 50 }, (_, i) => [i, i % 2 ? 0.2 : -0.2, 0.5] as [number, number, number]);
    expect(simplify(line, 0.5).length).toBe(2);
    const s = steady(line, 1);
    expect(Math.abs(s[25][1])).toBeLessThan(0.2);
  });
  it("타임트리: 날짜 순서대로 가로 배치", () => {
    const b: Board = { items: [it_("x", { date: "2021-03" }), it_("y", { date: "1987" }), it_("z")], links: [{ id: "l", from: "y", to: "z", kind: "curve" }], strokes: [] };
    const r = timetree(b, { x: 0, y: 0 });
    const pos = (id: string) => r.items.find((i) => i.id === id)!;
    expect(pos("y").x).toBeLessThan(pos("x").x);
    expect(pos("z").y).not.toBe(0);
    expect(dateKey("2021-03-05")).toBe(20210305);
  });
  it("마인드맵: 자식은 오른쪽", () => {
    const b: Board = { items: [it_("r"), it_("a"), it_("b")], links: [{ id: "1", from: "r", to: "a", kind: "curve" }, { id: "2", from: "r", to: "b", kind: "curve" }], strokes: [] };
    const out = mindmap(b, "r", m);
    const a = out.find((i) => i.id === "a")!, b2 = out.find((i) => i.id === "b")!;
    expect(a.x).toBeGreaterThan(200);
    expect(b2.y).toBeGreaterThan(a.y);
  });
  it("예전 문서 변환", () => {
    const b = migrate({ nodes: [{ id: "n", position: { x: 1, y: 2 }, data: { label: "L", tone: "blue" } }], edges: [{ id: "e", source: "n", target: "n" }], timeline: [{ id: "t", date: "2020", title: "T" }] });
    expect(b.items.map((i) => i.shape)).toEqual(["card", "milestone"]);
    expect(b.links[0].from).toBe("n");
  });
  it("자동 정렬: 겹치지 않고, 핀 카드는 그대로", () => {
    const b: Board = { items: [it_("r", { x: 5, y: 5 }), it_("a", { x: 5, y: 5 }), it_("s1", { x: 5, y: 5 }), it_("s2", { x: 5, y: 5 }), it_("p", { x: 999, y: 999 })], links: [{ id: "1", from: "r", to: "a", kind: "curve" }], strokes: [], pins: [{ id: "pin", label: "p", box: { x: 999, y: 999, w: 10, h: 10 }, items: ["p"] }] };
    const out = autoArrange(b, m);
    const pos = (id: string) => out.find((i) => i.id === id)!;
    const boxes = ["r", "a", "s1", "s2"].map((id) => pos(id));
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const A = boxes[i], B = boxes[j];
      expect(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y).toBe(true);
    }
    expect(pos("p").x).toBe(999);
  });
  it("중앙 정렬: 연결된 카드는 중심 둘레", () => {
    const b: Board = { items: [it_("c", { x: 0, y: 0 }), it_("a"), it_("b")], links: [{ id: "1", from: "c", to: "a", kind: "curve" }, { id: "2", from: "b", to: "c", kind: "curve" }], strokes: [] };
    const out = radial(b, "c", m);
    const d = (id: string) => { const i = out.find((x) => x.id === id)!; return Math.hypot(i.x + i.w / 2 - 100, i.y + i.h / 2 - 32); };
    expect(d("a")).toBeGreaterThan(150);
    expect(Math.abs(d("a") - d("b"))).toBeLessThan(1);
  });
});
