// 캔버스 보드: 데이터 · 배치 · 기하 (순수 함수, 테스트 대상)

export type Shape = "card" | "note" | "pill" | "ellipse" | "diamond" | "hex" | "text" | "folder" | "milestone";
export type Tone = "ink" | "gold" | "blue" | "rose" | "sage" | "plum";
export type LinkKind = "curve" | "line" | "elbow";

export type Item = {
  id: string;
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  tone: Tone;
  parent?: string | null; // 다른 카드 · 폴더 안
  collapsed?: boolean;
  date?: string; // 타임트리용 (1987, 2021-03 …)
};
export type Link = { id: string; from: string; to: string; kind: LinkKind; arrow?: boolean };
// 펜 획: [x, y, 압력] 평탄 배열 (소수 1자리)
export type Stroke = { id: string; pts: number[]; color: string; size: number; stream: number };
// 핀: 고정해 두고 언제든 돌아갈 자리 (카드들 또는 올가미 영역)
export type Pin = { id: string; label: string; box: { x: number; y: number; w: number; h: number }; poly?: { x: number; y: number }[]; items: string[] };
export type Board = { items: Item[]; links: Link[]; strokes: Stroke[]; pins?: Pin[] };

export const EMPTY_BOARD: Board = { items: [], links: [], strokes: [] };
export const SHAPES: Shape[] = ["card", "note", "pill", "ellipse", "diamond", "hex", "text", "milestone", "folder"];
export const TONES: Tone[] = ["ink", "gold", "blue", "rose", "sage", "plum"];
// 안에 넣을 수 있는 모양
export const isContainer = (s: Shape) => s === "card" || s === "note" || s === "folder";
const MAX_DEPTH = 4;

export const DEFAULT_SIZE: Record<Shape, [number, number]> = {
  card: [200, 64], note: [180, 150], pill: [170, 46], ellipse: [150, 96], diamond: [150, 110],
  hex: [160, 92], text: [220, 40], folder: [150, 104], milestone: [170, 58],
};

export type Box = { x: number; y: number; w: number; h: number };
export type Placed = Box & { id: string; depth: number; hidden: boolean; inset: boolean };

// ─── 글자 줄바꿈 (측정 함수 주입)
export type Measure = (s: string, size: number, bold?: boolean) => number;
export const FONT_SIZE = (s: Shape) => (s === "text" ? 17 : s === "note" ? 14 : 13.5);
export const LINE = 1.45;
export const PAD = 14;

export function wrap(text: string, width: number, size: number, measure: Measure): string[] {
  const out: string[] = [];
  for (const para of (text || "").split("\n")) {
    if (!para) { out.push(""); continue; }
    let line = "";
    // 공백 단위, 긴 단어는 글자 단위
    for (const word of para.split(/(\s+)/)) {
      const next = line + word;
      if (measure(next, size) <= width || !line.trim()) {
        if (measure(next, size) > width) {
          for (const ch of [...word]) {
            if (measure(line + ch, size) > width && line) { out.push(line); line = ch; } else line += ch;
          }
        } else line = next;
      } else { out.push(line.trimEnd()); line = word.trimStart(); }
    }
    out.push(line.trimEnd());
  }
  return out;
}

// 모양별 글자 영역 폭
export const textWidth = (it: Pick<Item, "shape" | "w">) =>
  Math.max(20, it.shape === "diamond" ? it.w * 0.56 : it.shape === "ellipse" ? it.w * 0.72 : it.shape === "hex" ? it.w * 0.74 : it.shape === "milestone" ? it.w - 30 : it.w - PAD * 2);

// ─── 트리
export const childrenOf = (items: Item[], id: string | null) => items.filter((i) => (i.parent ?? null) === id);

export function descendants(items: Item[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (p: string) => { for (const c of items) if (c.parent === p && !out.has(c.id)) { out.add(c.id); walk(c.id); } };
  walk(id);
  return out;
}

export function depthOf(items: Item[], id: string): number {
  const by = new Map(items.map((i) => [i.id, i]));
  let d = 0, cur = by.get(id);
  while (cur?.parent && d < 20) { d++; cur = by.get(cur.parent); }
  return d;
}

// 넣기 가능 여부 (자기 자신 · 후손 · 깊이 제한)
export function canNest(items: Item[], child: string, target: string): boolean {
  if (child === target) return false;
  const t = items.find((i) => i.id === target);
  if (!t || !isContainer(t.shape)) return false;
  if (descendants(items, child).has(target)) return false;
  const sub = Math.max(0, ...[...descendants(items, child)].map((d) => depthOf(items, d) - depthOf(items, child)));
  return depthOf(items, target) + 1 + sub <= MAX_DEPTH;
}

export function nest(items: Item[], child: string, target: string | null): Item[] {
  if (target && !canNest(items, child, target)) return items;
  return items.map((i) => (i.id === child ? { ...i, parent: target } : i));
}

// ─── 배치: 펼친 카드 안 자식은 세로로 쌓기, 폴더 · 접힌 카드 안은 숨김
export function layout(items: Item[], measure: Measure): Map<string, Placed> {
  const out = new Map<string, Placed>();
  const kids = new Map<string | null, Item[]>();
  for (const i of items) {
    const k = i.parent && items.some((p) => p.id === i.parent) ? i.parent : null;
    kids.set(k, [...(kids.get(k) ?? []), i]);
  }
  const textH = (it: Item, w: number) => {
    const fs = FONT_SIZE(it.shape);
    const n = wrap(it.text, textWidth({ shape: it.shape, w }), fs, measure).length;
    return n * fs * LINE;
  };
  const place = (it: Item, x: number, y: number, w: number, depth: number, hidden: boolean, inset: boolean): number => {
    const own = textH(it, w);
    const children = kids.get(it.id) ?? [];
    const open = isContainer(it.shape) && it.shape !== "folder" && !it.collapsed && children.length > 0;
    let h = Math.max(it.h, own + PAD * 2 + (it.shape === "diamond" || it.shape === "hex" ? 26 : it.shape === "ellipse" ? 18 : 0));
    if (it.shape === "folder") h = Math.max(it.h, 104);
    if (open) {
      let cy = y + PAD + own + 10;
      for (const c of children) cy += place(c, x + 10, cy, w - 20, depth + 1, hidden, true) + 8;
      h = Math.max(h, cy - y + 2);
    } else {
      for (const c of children) place(c, x + 10, y + 10, Math.max(60, w - 20), depth + 1, true, true);
    }
    out.set(it.id, { id: it.id, x, y, w, h, depth, hidden, inset });
    return h;
  };
  for (const r of kids.get(null) ?? []) place(r, r.x, r.y, r.w, 0, false, false);
  return out;
}

// ─── 모양 경로 (SVG path · Path2D 공용)
export function shapePath(shape: Shape, b: Box): string {
  const { x, y, w, h } = b;
  const r = (rx: number) => `M${x + rx} ${y}H${x + w - rx}Q${x + w} ${y} ${x + w} ${y + rx}V${y + h - rx}Q${x + w} ${y + h} ${x + w - rx} ${y + h}H${x + rx}Q${x} ${y + h} ${x} ${y + h - rx}V${y + rx}Q${x} ${y} ${x + rx} ${y}Z`;
  switch (shape) {
    case "pill": return r(Math.min(h, w) / 2);
    case "ellipse": return `M${x} ${y + h / 2}A${w / 2} ${h / 2} 0 1 0 ${x + w} ${y + h / 2}A${w / 2} ${h / 2} 0 1 0 ${x} ${y + h / 2}Z`;
    case "diamond": return `M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z`;
    case "hex": { const k = Math.min(w * 0.22, h * 0.5); return `M${x + k} ${y}H${x + w - k}L${x + w} ${y + h / 2}L${x + w - k} ${y + h}H${x + k}L${x} ${y + h / 2}Z`; }
    case "note": { const f = 16; return `M${x} ${y}H${x + w}V${y + h - f}L${x + w - f} ${y + h}H${x}Z`; }
    case "folder": { const tw = Math.min(64, w * 0.45), th = 12; return `M${x} ${y + th}V${y + 4}Q${x} ${y} ${x + 4} ${y}H${x + tw - 8}L${x + tw} ${y + th}H${x + w - 6}Q${x + w} ${y + th} ${x + w} ${y + th + 6}V${y + h - 6}Q${x + w} ${y + h} ${x + w - 6} ${y + h}H${x + 6}Q${x} ${y + h} ${x} ${y + h - 6}Z`; }
    case "text": return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    case "milestone": return r(8);
    default: return r(10);
  }
}

// ─── 연결선: 상자 경계에서 시작
export const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export function edgePoint(b: Box, toward: { x: number; y: number }) {
  const c = center(b);
  const dx = toward.x - c.x, dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const sx = Math.abs(dx) > 1e-6 ? (b.w / 2) / Math.abs(dx) : Infinity;
  const sy = Math.abs(dy) > 1e-6 ? (b.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

export function linkPath(a: Box, b: Box, kind: LinkKind): string {
  const p = edgePoint(a, center(b)), q = edgePoint(b, center(a));
  if (kind === "line") return `M${p.x} ${p.y}L${q.x} ${q.y}`;
  if (kind === "elbow") { const mx = (p.x + q.x) / 2; return `M${p.x} ${p.y}H${mx}V${q.y}H${q.x}`; }
  const horiz = Math.abs(q.x - p.x) >= Math.abs(q.y - p.y);
  const k = (horiz ? Math.abs(q.x - p.x) : Math.abs(q.y - p.y)) * 0.45;
  return horiz
    ? `M${p.x} ${p.y}C${p.x + Math.sign(q.x - p.x) * k} ${p.y} ${q.x - Math.sign(q.x - p.x) * k} ${q.y} ${q.x} ${q.y}`
    : `M${p.x} ${p.y}C${p.x} ${p.y + Math.sign(q.y - p.y) * k} ${q.x} ${q.y - Math.sign(q.y - p.y) * k} ${q.x} ${q.y}`;
}

// ─── 선택: 사각 · 올가미
export type Pt = { x: number; y: number };
export function inPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export const rectPoly = (r: Box): Pt[] => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
export const boxCorners = (b: Box): Pt[] => rectPoly(b);
// 상자가 영역 안 (중심 + 모서리 과반)
export function boxInPoly(b: Box, poly: Pt[]) {
  const pts = [center(b), ...boxCorners(b)];
  return inPoly(center(b), poly) && pts.filter((p) => inPoly(p, poly)).length >= 3;
}
export function strokePts(s: Stroke): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 2 < s.pts.length; i += 3) out.push({ x: s.pts[i], y: s.pts[i + 1] });
  return out;
}
export function strokeInPoly(s: Stroke, poly: Pt[]) {
  const ps = strokePts(s);
  return ps.length > 0 && ps.filter((p) => inPoly(p, poly)).length / ps.length >= 0.6;
}
export function boundsOf(pts: Pt[], pad = 0): Box {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
}
export function strokeBox(s: Stroke): Box {
  return boundsOf(strokePts(s), s.size);
}

// 점과 선분 거리 (지우개)
export function distToStroke(p: Pt, s: Stroke): number {
  const ps = strokePts(s);
  let best = Infinity;
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i], b = ps[i + 1] ?? a;
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))) : 0;
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

// ─── 획 단순화 (Ramer–Douglas–Peucker) · 손떨림 보정 (이동 평균)
export function simplify(pts: [number, number, number][], eps: number): [number, number, number][] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = dx || dy ? Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy) : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

// 민감도 0~1 → 창 크기
export function steady(pts: [number, number, number][], amount: number): [number, number, number][] {
  const n = Math.round(amount * 6);
  if (n < 1 || pts.length < 3) return pts;
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    let sx = 0, sy = 0, c = 0;
    for (let j = Math.max(0, i - n); j <= Math.min(pts.length - 1, i + n); j++) { sx += pts[j][0]; sy += pts[j][1]; c++; }
    return [sx / c, sy / c, p[2]];
  });
}

export const pack = (pts: [number, number, number][]) => pts.flatMap(([x, y, p]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100]);
export const unpack = (flat: number[]): [number, number, number][] => {
  const out: [number, number, number][] = [];
  for (let i = 0; i + 2 < flat.length; i += 3) out.push([flat[i], flat[i + 1], flat[i + 2]]);
  return out;
};

// ─── 자동 정렬: 마인드맵 (왼→오 트리)
export function mindmap(board: Board, rootId: string, measure: Measure): Item[] {
  const roots = board.items.filter((i) => !i.parent);
  const ids = new Set(roots.map((r) => r.id));
  const adj = new Map<string, string[]>();
  for (const l of board.links) if (ids.has(l.from) && ids.has(l.to)) adj.set(l.from, [...(adj.get(l.from) ?? []), l.to]);
  const L = layout(board.items, measure);
  const seen = new Set([rootId]);
  const pos = new Map<string, { x: number; y: number }>();
  const root = L.get(rootId);
  if (!root) return board.items;
  let cursor = root.y;
  const visit = (id: string, x: number): number => {
    const kids = (adj.get(id) ?? []).filter((k) => !seen.has(k));
    kids.forEach((k) => seen.add(k));
    const me = L.get(id)!;
    if (!kids.length) { pos.set(id, { x, y: cursor }); cursor += me.h + 22; return cursor - me.h - 22 + me.h / 2; }
    const mids = kids.map((k) => visit(k, x + me.w + 90));
    const mid = (mids[0] + mids[mids.length - 1]) / 2;
    pos.set(id, { x, y: mid - me.h / 2 });
    return mid;
  };
  visit(rootId, root.x);
  const dy = root.y - (pos.get(rootId)?.y ?? root.y);
  return board.items.map((i) => (pos.has(i.id) ? { ...i, x: pos.get(i.id)!.x, y: pos.get(i.id)!.y + dy } : i));
}

// ─── 타임트리: 날짜 순 가로축, 연결된 가지는 위아래로
export function dateKey(d?: string): number | null {
  if (!d) return null;
  const m = d.trim().match(/^(-?\d{1,4})(?:[-./](\d{1,2}))?(?:[-./](\d{1,2}))?/);
  if (!m) return null;
  return Number(m[1]) * 10000 + Number(m[2] ?? 0) * 100 + Number(m[3] ?? 0);
}

export function timetree(board: Board, origin: Pt): { items: Item[]; axis: { x1: number; x2: number; y: number } | null } {
  const dated = board.items.filter((i) => !i.parent && dateKey(i.date) !== null).sort((a, b) => dateKey(a.date)! - dateKey(b.date)!);
  if (!dated.length) return { items: board.items, axis: null };
  const gap = 210;
  const pos = new Map<string, Pt>();
  dated.forEach((d, i) => pos.set(d.id, { x: origin.x + i * gap, y: origin.y - d.h / 2 }));
  // 연결된 날짜 없는 카드: 가지로 위아래 교대
  const byId = new Map(board.items.map((i) => [i.id, i]));
  dated.forEach((d, i) => {
    const branch = board.links.flatMap((l) => (l.from === d.id ? [l.to] : l.to === d.id ? [l.from] : [])).map((id) => byId.get(id)).filter((b): b is Item => !!b && !b.parent && dateKey(b.date) === null && !pos.has(b.id));
    branch.forEach((b, j) => {
      const up = (i + j) % 2 === 0;
      const lvl = Math.floor(j / 2) + 1;
      pos.set(b.id, { x: origin.x + i * gap + (d.w - b.w) / 2, y: up ? origin.y - 70 - lvl * (b.h + 26) : origin.y + 70 + (lvl - 1) * (b.h + 26) });
    });
  });
  const items = board.items.map((i) => (pos.has(i.id) ? { ...i, x: pos.get(i.id)!.x, y: pos.get(i.id)!.y } : i));
  const last = dated[dated.length - 1];
  return { items, axis: { x1: origin.x - 40, x2: origin.x + (dated.length - 1) * gap + last.w + 40, y: origin.y } };
}

// ─── 예전 문서 (노드 보드 · 타임라인) → 보드
type OldNode = { id: string; position?: { x: number; y: number }; data?: { label?: string; tone?: string } };
type OldEdge = { id: string; source: string; target: string };
type OldEvent = { id: string; date: string; title: string };
const toneOf = (t?: string): Tone => (TONES as string[]).includes(t ?? "") ? (t as Tone) : "gold";

export function migrate(raw: { board?: unknown; nodes?: unknown; edges?: unknown; timeline?: unknown }): Board {
  const b = raw.board as Partial<Board> | undefined;
  if (b && typeof b === "object") {
    return {
      items: Array.isArray(b.items) ? b.items.filter((i) => i && typeof i.id === "string") : [],
      links: Array.isArray(b.links) ? b.links : [],
      strokes: Array.isArray(b.strokes) ? b.strokes : [],
      pins: Array.isArray(b.pins) ? b.pins.filter((p) => p && typeof p.id === "string" && p.box) : [],
    };
  }
  const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []) as OldNode[];
  const edges = (Array.isArray(raw.edges) ? raw.edges : []) as OldEdge[];
  const events = (Array.isArray(raw.timeline) ? raw.timeline : []) as OldEvent[];
  const items: Item[] = nodes.map((n) => ({ id: n.id, shape: "card", x: n.position?.x ?? 0, y: n.position?.y ?? 0, w: 200, h: 64, text: n.data?.label ?? "", tone: toneOf(n.data?.tone) }));
  events.forEach((e, i) => items.push({ id: e.id, shape: "milestone", x: i * 210, y: 420, w: 170, h: 58, text: e.title, date: e.date, tone: "gold" }));
  return { items, links: edges.map((e) => ({ id: e.id, from: e.source, to: e.target, kind: "curve", arrow: true })), strokes: [] };
}

// 핀에 묶인 카드 (움직이지 않음)
export const pinnedIds = (b: Board) => new Set((b.pins ?? []).flatMap((p) => p.items));

// ─── 중앙 정렬: 가운데 카드를 중심으로 연결된 카드를 동심원에 배치
export function radial(board: Board, centerId: string, measure: Measure): Item[] {
  const L = layout(board.items, measure);
  const c = L.get(centerId);
  if (!c) return board.items;
  const fixed = pinnedIds(board);
  const roots = new Set(board.items.filter((i) => !i.parent).map((i) => i.id));
  const adj = new Map<string, string[]>();
  for (const l of board.links) {
    if (!roots.has(l.from) || !roots.has(l.to)) continue;
    adj.set(l.from, [...(adj.get(l.from) ?? []), l.to]);
    adj.set(l.to, [...(adj.get(l.to) ?? []), l.from]);
  }
  // 너비 우선으로 고리 나누기
  const level = new Map([[centerId, 0]]);
  const rings: string[][] = [];
  let frontier = [centerId];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) for (const n of adj.get(id) ?? []) if (!level.has(n)) { level.set(n, level.get(id)! + 1); next.push(n); }
    if (next.length) rings.push(next);
    frontier = next;
  }
  const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  const pos = new Map<string, Pt>();
  rings.forEach((ring, r) => {
    const widest = Math.max(...ring.map((id) => L.get(id)!.w));
    const radius = Math.max((r + 1) * (Math.max(c.w, c.h) / 2 + widest / 2 + 90), (ring.length * (widest + 30)) / (2 * Math.PI));
    ring.forEach((id, i) => {
      if (fixed.has(id)) return;
      const a = -Math.PI / 2 + (i / ring.length) * Math.PI * 2 + r * 0.35;
      const b = L.get(id)!;
      pos.set(id, { x: Math.round(cx + Math.cos(a) * radius - b.w / 2), y: Math.round(cy + Math.sin(a) * radius - b.h / 2) });
    });
  });
  return board.items.map((i) => (pos.has(i.id) ? { ...i, ...pos.get(i.id)! } : i));
}

// ─── 자동 정렬: 연결 묶음은 트리로, 외톨이 카드는 격자로, 묶음끼리 겹치지 않게
export function autoArrange(board: Board, measure: Measure): Item[] {
  const fixed = pinnedIds(board);
  const roots = board.items.filter((i) => !i.parent);
  const ids = new Set(roots.map((r) => r.id));
  const und = new Map<string, string[]>();
  for (const l of board.links) {
    if (!ids.has(l.from) || !ids.has(l.to)) continue;
    und.set(l.from, [...(und.get(l.from) ?? []), l.to]);
    und.set(l.to, [...(und.get(l.to) ?? []), l.from]);
  }
  // 연결 묶음 찾기
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const r of roots) {
    if (seen.has(r.id)) continue;
    const g: string[] = [];
    const stack = [r.id];
    seen.add(r.id);
    while (stack.length) { const id = stack.pop()!; g.push(id); for (const n of und.get(id) ?? []) if (!seen.has(n)) { seen.add(n); stack.push(n); } }
    groups.push(g);
  }
  const L = layout(board.items, measure);
  const startX = Math.min(...roots.map((r) => r.x), 0), startY = Math.min(...roots.map((r) => r.y), 0);
  const out = new Map<string, Pt>();
  let cx = startX, cy = startY, rowH = 0;
  const WRAP = 1600;
  const place = (members: string[], arranged: Map<string, Pt>) => {
    // 묶음 상자 크기
    const xs = members.map((id) => arranged.get(id)!.x), ys = members.map((id) => arranged.get(id)!.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const w = Math.max(...members.map((id) => arranged.get(id)!.x + L.get(id)!.w)) - minX;
    const h = Math.max(...members.map((id) => arranged.get(id)!.y + L.get(id)!.h)) - minY;
    if (cx > startX && cx + w > startX + WRAP) { cx = startX; cy += rowH + 80; rowH = 0; }
    for (const id of members) if (!fixed.has(id)) out.set(id, { x: Math.round(cx + arranged.get(id)!.x - minX), y: Math.round(cy + arranged.get(id)!.y - minY) });
    cx += w + 120; rowH = Math.max(rowH, h);
  };
  const singles = groups.filter((g) => g.length === 1).map((g) => g[0]);
  for (const g of groups.filter((g) => g.length > 1).sort((a, b) => b.length - a.length)) {
    // 나가는 연결이 가장 많은 카드를 뿌리로
    const out_ = (id: string) => board.links.filter((l) => l.from === id && g.includes(l.to)).length;
    const root = [...g].sort((a, b) => out_(b) - out_(a))[0];
    const sub: Board = { ...board, items: board.items.filter((i) => g.includes(i.id) || (i.parent && g.includes(i.parent))) };
    const arranged = new Map(mindmap(sub, root, measure).filter((i) => g.includes(i.id)).map((i) => [i.id, { x: i.x, y: i.y }]));
    place(g, arranged);
  }
  // 외톨이: 4열 격자
  if (singles.length) {
    const colW = Math.max(...singles.map((id) => L.get(id)!.w)) + 40;
    const grid = new Map<string, Pt>();
    let y = 0, col = 0, rowMax = 0;
    for (const id of singles) {
      grid.set(id, { x: col * colW, y });
      rowMax = Math.max(rowMax, L.get(id)!.h);
      col++;
      if (col === 4) { col = 0; y += rowMax + 40; rowMax = 0; }
    }
    place(singles, grid);
  }
  return board.items.map((i) => (out.has(i.id) ? { ...i, ...out.get(i.id)! } : i));
}
