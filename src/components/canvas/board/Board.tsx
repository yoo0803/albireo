"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SIZE, FONT_SIZE, LINE, PAD, SHAPES, TONES, boundsOf, boxInPoly, canNest, center, childrenOf, dateKey, descendants,
  autoArrange, distToStroke, isContainer, layout, linkPath, mindmap, nest, pack, pinnedIds, radial, rectPoly, shapePath, simplify, steady, strokeBox, strokeInPoly,
  textWidth, timetree, wrap, type Board as BoardData, type Box, type Pin, type Item, type LinkKind, type Placed, type Pt, type Shape, type Stroke, type Tone,
} from "@/lib/board/model";
import { inkPath, strokePath } from "./ink";
import { exportPNG, readPalette } from "./exporter";
import { useLang, useT } from "@/lib/i18n/client";
import { uid } from "../types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { appendImage } from "@/app/studio/actions";
import { Tour } from "./Tour";

// 캔버스 보드: 카드 · 도형 · 연결 · 중첩 · 폴더 · 타임트리 · 펜 필기 · 영역 선택 내보내기
export const FONT = `"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`;
type Tool = "select" | "hand" | "pen" | "eraser" | "link";
type View = { x: number; y: number; k: number };
type Region = { box: Box; poly?: Pt[] };
type Drag =
  | { t: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { t: "move"; ids: string[]; start: Pt; orig: Map<string, Pt>; moved: boolean; click?: string }
  | { t: "marquee"; a: Pt; b: Pt }
  | { t: "lasso"; pts: Pt[] }
  | { t: "draw"; pts: [number, number, number][] }
  | { t: "erase"; hit: boolean }
  | { t: "link"; from: string; p: Pt; over: string | null }
  | { t: "resize"; id: string; start: Pt; w0: number; h0: number }
  | { t: "pinch"; d0: number; k0: number; m0: Pt; v0: View };
type Ghost = { key: string; item: Item; box: Box; to: Pt };

const PALETTE = ["#1c1a16", "#c08a1f", "#2c5aa0", "#b8452c", "#4f7a5c", "#6d2b5b", "#7a8fa8", "#ffffff"];
const SHAPE_NAME: Record<Shape, [string, string]> = {
  card: ["카드", "Card"], note: ["메모지", "Sticky"], pill: ["알약", "Pill"], ellipse: ["원", "Ellipse"], diamond: ["마름모", "Diamond"],
  hex: ["육각형", "Hexagon"], text: ["글자", "Text"], milestone: ["사건 (타임트리)", "Milestone"], folder: ["폴더", "Folder"],
};
const PREFS = "albireo:pen";

// 글자 폭 측정 (화면 · 내보내기 공용)
let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, size: number, bold = false) => {
  if (typeof document === "undefined") return s.length * size * 0.56;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return s.length * size * 0.56;
  ctx.font = `${bold ? 600 : 500} ${size}px ${FONT}`;
  return ctx.measureText(s).width;
};

type Props = {
  value: BoardData;
  onChange: (b: BoardData) => void;
  canvasId: string | null;
  userId?: string;
  articles?: { id: string; title: string }[];
};

export function Board({ value, onChange, canvasId, userId, articles = [] }: Props) {
  const t = useT();
  const lang = useLang();
  const [board, setBoard] = useState<BoardData>(value);
  const [view, setView] = useState<View>({ x: 80, y: 60, k: 1 });
  const [tool, setTool] = useState<Tool>("hand"); // 기본: 손 (빈 곳 끌면 이동, 카드는 그대로 집기)
  const [selMode, setSelMode] = useState<"rect" | "lasso">("rect");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [selStrokes, setSelStrokes] = useState<Set<string>>(new Set());
  const [selLink, setSelLink] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drop, setDrop] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [tray, setTray] = useState<string | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [gulp, setGulp] = useState<string | null>(null);
  const [shapeMenu, setShapeMenu] = useState(false);
  const [arrange, setArrange] = useState(false);
  const [pen, setPen] = useState({ color: PALETTE[0], size: 4, steady: 0.5 });
  const [dialog, setDialog] = useState<null | { kind: "ocr"; text: string; busy: boolean; progress: number; keep: boolean; err?: boolean } | { kind: "insert"; article: string; caption: string; busy: boolean; done: string | null; err: string | null }>(null);
  const [space, setSpace] = useState(false);
  const [selPin, setSelPin] = useState<string | null>(null);
  const [newPin, setNewPin] = useState<string | null>(null);
  const [pinMenu, setPinMenu] = useState(false);
  const [tour, setTour] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote((x) => (x === m ? null : x)), 2600); };
  const [fontsReady, setFontsReady] = useState(0);
  const svg = useRef<SVGSVGElement>(null);
  const wrapEl = useRef<HTMLDivElement>(null);
  const past = useRef<BoardData[]>([]);
  const future = useRef<BoardData[]>([]);
  const pointers = useRef(new Map<number, Pt>());
  const boardRef = useRef(board);
  boardRef.current = board;
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const editingRef = useRef<string | null>(null);
  editingRef.current = editing;

  // 펜 설정 기억 (기기별)
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem(PREFS) ?? "null"); if (v && typeof v.color === "string") setPen((p) => ({ ...p, ...v })); } catch {}
    document.fonts?.ready.then(() => setFontsReady((n) => n + 1));
    try { if (!localStorage.getItem("albireo:board-tour:v1")) setTour(true); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify(pen)); } catch {} }, [pen]);

  const placed = useMemo(() => {
    void fontsReady;
    return layout(board.items, measure);
  }, [board.items, fontsReady]);

  // ─── 기록 (실행 취소)
  const commit = useCallback((next: BoardData, record = true) => {
    if (record) { past.current = [...past.current.slice(-59), boardRef.current]; future.current = []; }
    setBoard(next);
    onChange(next);
  }, [onChange]);
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(boardRef.current); setBoard(p); onChange(p); };
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(boardRef.current); setBoard(f); onChange(f); };

  // 글 고치기 마치기: 다른 곳을 눌러 편집창이 닫혀도 저장
  const finishEdit = useCallback(() => {
    const id = editingRef.current;
    if (!id) return;
    const text = (editRef.current?.value ?? "").slice(0, 2000);
    editingRef.current = null;
    setEditing(null);
    const cur = boardRef.current.items.find((i) => i.id === id);
    if (editRef.current && cur && text !== cur.text) commit({ ...boardRef.current, items: boardRef.current.items.map((i) => (i.id === id ? { ...i, text } : i)) });
    wrapEl.current?.focus({ preventScroll: true });
  }, [commit]);

  // ─── 좌표
  const world = (cx: number, cy: number): Pt => {
    const r = svg.current!.getBoundingClientRect();
    return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k };
  };
  const screen = (p: Pt) => ({ x: p.x * view.k + view.x, y: p.y * view.k + view.y });

  // 휠: 이동 · ctrl/핀치 확대
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => {
        if (e.ctrlKey || e.metaKey) {
          const k = Math.min(3, Math.max(0.2, v.k * Math.exp(-e.deltaY * 0.0022)));
          const mx = e.clientX - r.left, my = e.clientY - r.top;
          return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
        }
        return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) => {
    const r = svg.current!.getBoundingClientRect();
    setView((v) => { const k = Math.min(3, Math.max(0.2, v.k * f)); const mx = r.width / 2, my = r.height / 2; return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k }; });
  };
  const fit = useCallback(() => {
    const b = boardRef.current;
    const boxes: Box[] = [...[...layout(b.items, measure).values()].filter((p) => !p.hidden), ...b.strokes.map(strokeBox)];
    const r = svg.current?.getBoundingClientRect();
    if (!r || !boxes.length) { setView({ x: 80, y: 60, k: 1 }); return; }
    // 왼쪽 도구 · 위쪽 막대 자리 비우기
    const bb = boundsOf(boxes.flatMap(rectPoly), 30);
    const L = 64, Tp = 56, W = r.width - L - 16, H = r.height - Tp - 16;
    const k = Math.min(1.4, Math.max(0.2, Math.min(W / bb.w, H / bb.h)));
    setView({ k, x: L + (W - bb.w * k) / 2 - bb.x * k, y: Tp + (H - bb.h * k) / 2 - bb.y * k });
  }, []);
  useEffect(() => { fit(); }, [fit]);

  // ─── 편집 도우미
  const byId = useMemo(() => new Map(board.items.map((i) => [i.id, i])), [board.items]);
  const clearSel = () => { setSel(new Set()); setSelStrokes(new Set()); setSelLink(null); setRegion(null); setSelPin(null); };
  const addItem = (shape: Shape, at: Pt, extra: Partial<Item> = {}): Item => {
    const [w, h] = DEFAULT_SIZE[shape];
    return { id: uid(), shape, x: Math.round(at.x - w / 2), y: Math.round(at.y - h / 2), w, h, text: "", tone: shape === "milestone" ? "gold" : shape === "folder" ? "blue" : "ink", ...extra };
  };
  const viewCenter = (): Pt => { const r = svg.current!.getBoundingClientRect(); return world(r.left + r.width / 2, r.top + r.height / 2); };
  const create = (shape: Shape, at = viewCenter()) => {
    const it = addItem(shape, at, shape === "milestone" ? { date: String(new Date().getFullYear()) } : {});
    commit({ ...board, items: [...board.items, it] });
    setSel(new Set([it.id])); setSelStrokes(new Set()); setRegion(null);
    if (shape !== "folder") setEditing(it.id);
    setTool("select"); setShapeMenu(false);
  };
  const removeSelected = () => {
    const kill = new Set<string>();
    sel.forEach((id) => { kill.add(id); descendants(board.items, id).forEach((d) => kill.add(d)); });
    commit({
      items: board.items.filter((i) => !kill.has(i.id)),
      links: board.links.filter((l) => !kill.has(l.from) && !kill.has(l.to) && l.id !== selLink),
      strokes: board.strokes.filter((s) => !selStrokes.has(s.id)),
    });
    clearSel();
  };
  const patchItems = (ids: Set<string>, p: Partial<Item>) => commit({ ...board, items: board.items.map((i) => (ids.has(i.id) ? { ...i, ...p } : i)) });
  // 연결된 새 카드 (Tab · 끌어 놓기)
  const branch = (fromId: string, at?: Pt) => {
    const from = placed.get(fromId);
    if (!from) return;
    const sibs = board.links.filter((l) => l.from === fromId).length;
    const pos = at ?? { x: from.x + from.w + 150, y: from.y + from.h / 2 + sibs * 84 };
    const src = byId.get(fromId);
    const it = addItem(src?.shape === "milestone" ? "card" : "card", pos, { tone: src?.tone ?? "ink" });
    commit({ ...board, items: [...board.items, it], links: [...board.links, { id: uid(), from: fromId, to: it.id, kind: "curve", arrow: false }] });
    setSel(new Set([it.id])); setEditing(it.id);
  };
  // 선택한 카드들을 새 카드 안에 묶기
  const group = () => {
    const roots = [...sel].filter((id) => !byId.get(id)?.parent);
    if (!roots.length) return;
    const bb = boundsOf(roots.flatMap((id) => rectPoly(placed.get(id)!)), 0);
    const box: Item = { id: uid(), shape: "card", x: bb.x, y: bb.y - 50, w: Math.max(240, bb.w * 0.7), h: 64, text: t("묶음", "Group"), tone: "ink" };
    let items = [...board.items, box];
    for (const id of roots) items = nest(items, id, box.id);
    commit({ ...board, items });
    setSel(new Set([box.id]));
  };

  // ─── 포인터
  const hitItem = (e: React.PointerEvent | PointerEvent) => (e.target as Element).closest?.("[data-id]")?.getAttribute("data-id") ?? null;
  const dropTargetAt = (p: Pt, dragged: string[]) => {
    const skip = new Set(dragged.flatMap((id) => [id, ...descendants(boardRef.current.items, id)]));
    let best: Placed | null = null;
    for (const pl of placed.values()) {
      const it = byId.get(pl.id);
      if (!it || pl.hidden || skip.has(pl.id) || !isContainer(it.shape)) continue;
      if (p.x >= pl.x && p.x <= pl.x + pl.w && p.y >= pl.y && p.y <= pl.y + pl.h && (!best || pl.depth >= best.depth)) best = pl;
    }
    return best && dragged.every((d) => canNest(boardRef.current.items, d, best!.id)) ? best.id : null;
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (editingRef.current) { finishEdit(); return; }
    setPinMenu(false);
    setShapeMenu(false); setArrange(false);
    svg.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setDrag({ t: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y), k0: view.k, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: view });
      return;
    }
    const p = world(e.clientX, e.clientY);
    const el = e.target as Element;
    const onThing = !!el.closest?.("[data-id], [data-handle], [data-link], [data-pin]");
    // 손 도구: 빈 곳은 화면 이동, 카드 · 손잡이는 선택과 같게
    if (space || e.button === 1 || (tool === "hand" && !onThing)) { if (tool === "hand" && !e.shiftKey) { clearSel(); setTray(null); } setDrag({ t: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }); return; }
    if (tool === "pen") { setDrag({ t: "draw", pts: [[p.x, p.y, e.pressure || 0.5]] }); return; }
    if (tool === "eraser") { setDrag({ t: "erase", hit: false }); erase(p, false); return; }
    // 핀 누르기: 핀 메뉴
    const pinId = el.closest?.("[data-pin]")?.getAttribute("data-pin");
    if (pinId) { clearSel(); setSelPin(pinId); return; }
    const handle = el.closest?.("[data-handle]");
    if (handle) {
      const kind = handle.getAttribute("data-handle"), of = handle.getAttribute("data-of")!;
      if (kind === "link") { setDrag({ t: "link", from: of, p, over: null }); return; }
      if (kind === "resize") { const it = byId.get(of)!; setDrag({ t: "resize", id: of, start: p, w0: it.w, h0: placed.get(of)!.h }); return; }
      if (kind === "toggle") { const it = byId.get(of)!; commit({ ...board, items: board.items.map((i) => (i.id === of ? { ...i, collapsed: !it.collapsed } : i)) }); return; }
    }
    const linkId = el.closest?.("[data-link]")?.getAttribute("data-link");
    if (linkId && (tool === "select" || tool === "hand")) { setSel(new Set()); setSelStrokes(new Set()); setRegion(null); setSelLink(linkId); return; }
    const id = hitItem(e);
    if (id) {
      if (tool === "link") { setDrag({ t: "link", from: id, p, over: null }); return; }
      let next = sel;
      if (e.shiftKey) { next = new Set(sel); if (next.has(id)) next.delete(id); else next.add(id); }
      else if (!sel.has(id)) next = new Set([id]);
      setSel(next); setSelLink(null); setRegion(null); setSelPin(null);
      if (!e.shiftKey) setSelStrokes(new Set());
      // 선택 안의 최상위만 이동
      // 핀으로 고정된 카드는 움직이지 않음
      const fixed = pinnedIds(board);
      const ids = [...next].filter((x) => { if (fixed.has(x)) return false; let c = byId.get(x)?.parent; while (c) { if (next.has(c)) return false; c = byId.get(c)?.parent; } return true; });
      if (!ids.length && fixed.has(id)) flash(t("핀으로 고정된 카드입니다. 핀을 뽑으면 옮길 수 있습니다.", "Pinned. Remove the pin to move it."));
      setDrag({ t: "move", ids, start: p, orig: new Map(ids.map((x) => [x, { x: placed.get(x)!.x, y: placed.get(x)!.y }])), moved: false, click: id });
      return;
    }
    if (!e.shiftKey) clearSel();
    setTray(null);
    setDrag(selMode === "lasso" ? { t: "lasso", pts: [p] } : { t: "marquee", a: p, b: p });
  };

  const erase = (p: Pt, hit: boolean) => {
    const r = 8 / view.k;
    const keep = boardRef.current.strokes.filter((s) => distToStroke(p, s) > r + s.size / 2);
    if (keep.length !== boardRef.current.strokes.length) {
      if (!hit) past.current = [...past.current.slice(-59), boardRef.current];
      setBoard((b) => ({ ...b, strokes: keep }));
      setDrag({ t: "erase", hit: true });
    }
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return;
    const p = world(e.clientX, e.clientY);
    switch (drag.t) {
      case "pinch": {
        const [a, b] = [...pointers.current.values()];
        if (!a || !b) return;
        const r = svg.current!.getBoundingClientRect();
        const k = Math.min(3, Math.max(0.2, drag.k0 * (Math.hypot(a.x - b.x, a.y - b.y) / drag.d0)));
        const m = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top };
        const m0 = { x: drag.m0.x - r.left, y: drag.m0.y - r.top };
        const wx = (m0.x - drag.v0.x) / drag.v0.k, wy = (m0.y - drag.v0.y) / drag.v0.k;
        setView({ k, x: m.x - wx * k, y: m.y - wy * k });
        return;
      }
      case "pan": setView((v) => ({ ...v, x: drag.vx + e.clientX - drag.sx, y: drag.vy + e.clientY - drag.sy })); return;
      case "draw": {
        const last = drag.pts[drag.pts.length - 1];
        if (Math.hypot(p.x - last[0], p.y - last[1]) * view.k < 1.2) return;
        setDrag({ ...drag, pts: [...drag.pts, [p.x, p.y, e.pressure || 0.5]] });
        return;
      }
      case "erase": erase(p, drag.hit); return;
      case "marquee": setDrag({ ...drag, b: p }); return;
      case "lasso": { const l = drag.pts[drag.pts.length - 1]; if (Math.hypot(p.x - l.x, p.y - l.y) * view.k > 3) setDrag({ ...drag, pts: [...drag.pts, p] }); return; }
      case "link": { const over = hitItem(e); setDrag({ ...drag, p, over: over && over !== drag.from ? over : null }); return; }
      case "resize": {
        const w = Math.max(80, Math.round(drag.w0 + p.x - drag.start.x)), h = Math.max(36, Math.round(drag.h0 + p.y - drag.start.y));
        setBoard((b) => ({ ...b, items: b.items.map((i) => (i.id === drag.id ? { ...i, w, h } : i)) }));
        return;
      }
      case "move": {
        const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
        if (!drag.moved && Math.hypot(dx, dy) * view.k < 4) return;
        let items = boardRef.current.items;
        if (!drag.moved) {
          past.current = [...past.current.slice(-59), boardRef.current];
          // 카드 안에서 끌어내면 꺼내기
          items = items.map((i) => (drag.ids.includes(i.id) && i.parent ? { ...i, parent: null } : i));
        }
        items = items.map((i) => { const o = drag.orig.get(i.id); return o ? { ...i, x: Math.round(o.x + dx), y: Math.round(o.y + dy) } : i; });
        setBoard((b) => ({ ...b, items }));
        if (!drag.moved) setDrag({ ...drag, moved: true });
        setDrop(dropTargetAt(p, drag.ids));
        return;
      }
    }
  };

  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const d = drag;
    setDrag(null);
    if (!d) return;
    const b = boardRef.current;
    switch (d.t) {
      case "draw": {
        if (d.pts.length < 2) return;
        const pts = simplify(steady(d.pts, pen.steady), 0.35 / view.k);
        const s: Stroke = { id: uid(), pts: pack(pts), color: pen.color, size: pen.size, stream: pen.steady };
        commit({ ...b, strokes: [...b.strokes, s] });
        return;
      }
      case "erase": if (d.hit) onChange(b); return;
      case "resize": past.current = [...past.current.slice(-59), { ...b }]; onChange(b); return;
      case "marquee": case "lasso": {
        const poly = d.t === "marquee" ? rectPoly(boundsOf([d.a, d.b])) : d.pts;
        const box = boundsOf(poly);
        if (box.w * view.k < 8 && box.h * view.k < 8) { clearSel(); return; }
        const items = [...placed.values()].filter((pl) => !pl.hidden && boxInPoly(pl, poly)).map((pl) => pl.id);
        const strokes = b.strokes.filter((s) => strokeInPoly(s, poly)).map((s) => s.id);
        setSel(new Set(items)); setSelStrokes(new Set(strokes)); setSelLink(null);
        setRegion({ box, poly: d.t === "lasso" ? d.pts : undefined });
        return;
      }
      case "link": {
        if (d.over) {
          if (!b.links.some((l) => (l.from === d.from && l.to === d.over) || (l.from === d.over && l.to === d.from)))
            commit({ ...b, links: [...b.links, { id: uid(), from: d.from, to: d.over, kind: "curve", arrow: true }] });
        } else {
          const from = placed.get(d.from)!;
          if (Math.hypot(d.p.x - center(from).x, d.p.y - center(from).y) > Math.max(from.w, from.h) / 2 + 30) branch(d.from, d.p);
        }
        return;
      }
      case "move": {
        if (!d.moved) {
          const it = d.click ? byId.get(d.click) : null;
          if (it?.shape === "folder") setTray((x) => (x === it.id ? null : it.id));
          return;
        }
        const target = drop;
        setDrop(null);
        if (!target) { onChange(b); return; }
        const folder = byId.get(target)?.shape === "folder";
        let items = b.items;
        for (const id of d.ids) items = nest(items, id, target);
        if (folder) {
          // 폴더 수납 모션
          const f = placed.get(target)!;
          setGhosts((g) => [...g, ...d.ids.map((id) => ({ key: uid(), item: b.items.find((i) => i.id === id)!, box: placed.get(id)!, to: { x: f.x + f.w / 2, y: f.y + f.h / 2 } }))]);
          setTimeout(() => setGhosts((g) => g.slice(d.ids.length)), 520);
          setGulp(target); setTimeout(() => setGulp(null), 600);
          setSel(new Set([target]));
        }
        setBoard({ ...b, items });
        onChange({ ...b, items });
        return;
      }
    }
  };

  // 폴더에서 꺼내기 (트레이 카드 누른 채 끌기)
  const takeOut = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    const p = world(e.clientX, e.clientY);
    const it = byId.get(id)!;
    past.current = [...past.current.slice(-59), board];
    const items = board.items.map((i) => (i.id === id ? { ...i, parent: null, x: Math.round(p.x - it.w / 2), y: Math.round(p.y - 20) } : i));
    setBoard({ ...board, items });
    setTray(null); setSel(new Set([id]));
    svg.current!.setPointerCapture(e.pointerId);
    setDrag({ t: "move", ids: [id], start: p, orig: new Map([[id, { x: p.x - it.w / 2, y: p.y - 20 }]]), moved: true });
  };

  const onDouble = (e: React.MouseEvent) => {
    if (tool !== "select" && tool !== "hand") return;
    const id = (e.target as Element).closest?.("[data-id]")?.getAttribute("data-id");
    if (id) { if (byId.get(id)?.shape !== "folder") setEditing(id); else setTray(id); return; }
    create("card", world(e.clientX, e.clientY));
  };

  // ─── 키보드
  const onKey = (e: React.KeyboardEvent) => {
    if (editing || (e.target as HTMLElement).closest("input, textarea, select")) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); setSel(new Set([...placed.values()].filter((p) => !p.hidden).map((p) => p.id))); setSelStrokes(new Set(board.strokes.map((s) => s.id))); return; }
    if (e.key === "Delete" || e.key === "Backspace") { if (sel.size || selStrokes.size || selLink) { e.preventDefault(); removeSelected(); } return; }
    if (e.key === "Escape") { clearSel(); setTray(null); return; }
    if (e.key === " ") { setSpace(true); e.preventDefault(); return; }
    if (e.key === "Enter" && sel.size === 1) { e.preventDefault(); setEditing([...sel][0]); return; }
    if (e.key === "Tab" && sel.size === 1) { e.preventDefault(); branch([...sel][0]); return; }
    const k = e.key.toLowerCase();
    const map: Record<string, Tool> = { v: "select", h: "hand", p: "pen", e: "eraser", l: "link" };
    if (!mod && map[k]) setTool(map[k]);
  };

  // ─── 정렬
  const runMindmap = () => {
    setArrange(false);
    const root = [...sel][0] ?? board.items.find((i) => !i.parent && board.links.some((l) => l.from === i.id))?.id;
    if (!root) { flash(t("연결된 카드가 없습니다. Tab이나 + 손잡이로 가지를 뻗어 보세요.", "No linked cards yet. Branch with Tab or the + handle.")); return; }
    commit({ ...board, items: mindmap(board, root, measure) });
    setArrange(false); setTimeout(fit, 420);
  };
  const runTimetree = () => {
    setArrange(false);
    const first = board.items.filter((i) => !i.parent && dateKey(i.date) !== null).sort((a, b) => dateKey(a.date)! - dateKey(b.date)!)[0];
    if (!first) { flash(t("날짜가 있는 ‘사건’ 카드가 없습니다.", "No dated milestones yet.")); return; }
    commit({ ...board, items: timetree(board, { x: first.x, y: first.y + first.h / 2 }).items });
    setArrange(false); setTimeout(fit, 420);
  };

  const runAuto = () => {
    setArrange(false);
    if (!board.items.some((i) => !i.parent)) { flash(t("정렬할 카드가 없습니다.", "Nothing to arrange.")); return; }
    commit({ ...board, items: autoArrange(board, measure) });
    setTimeout(fit, 450);
  };
  // 중앙 정렬: 선택한 카드(또는 고른 핀의 카드)를 가운데 두고 연결된 카드를 둘레에
  const runCenter = (centerId?: string) => {
    setArrange(false);
    const pin = selPin ? (board.pins ?? []).find((p) => p.id === selPin) : undefined;
    const c = centerId ?? [...sel][0] ?? pin?.items[0];
    if (!c || byId.get(c)?.parent) { flash(t("가운데 둘 카드를 먼저 고르거나 핀을 눌러 주십시오.", "Select a card or a pin to centre on.")); return; }
    const items = radial(board, c, measure);
    commit({ ...board, items });
    const pl = layout(items, measure).get(c);
    if (pl) setTimeout(() => flyTo({ x: pl.x - 260, y: pl.y - 220, w: pl.w + 520, h: pl.h + 440 }), 80);
  };

  // ─── 화면 이동 (부드럽게)
  const flyTo = (b: Box) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const k = Math.min(1.6, Math.max(0.25, Math.min((r.width - 120) / Math.max(b.w, 40), (r.height - 120) / Math.max(b.h, 40))));
    const to = { k, x: r.width / 2 - (b.x + b.w / 2) * k, y: r.height / 2 - (b.y + b.h / 2) * k };
    const from = { ...view };
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 520);
      const e = 1 - Math.pow(1 - p, 3);
      setView({ k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ─── 핀: 고른 카드 · 올가미 영역을 고정하고 언제든 돌아가기
  const pinSelection = () => {
    if (!selBox) return;
    const items = [...sel].filter((id) => !byId.get(id)?.parent);
    const first = items.map((id) => byId.get(id)?.text).find(Boolean);
    const n = (board.pins?.length ?? 0) + 1;
    const pin: Pin = { id: uid(), label: (first ?? t(`핀 ${n}`, `Pin ${n}`)).slice(0, 24), box: selBox, poly: region?.poly, items };
    commit({ ...board, pins: [...(board.pins ?? []), pin] });
    setNewPin(pin.id); setTimeout(() => setNewPin(null), 900);
    clearSel(); setSelPin(pin.id);
  };
  const unpin = (id: string) => { commit({ ...board, pins: (board.pins ?? []).filter((p) => p.id !== id) }); setSelPin(null); };
  const renamePin = (id: string, label: string) => setBoard((b) => ({ ...b, pins: (b.pins ?? []).map((p) => (p.id === id ? { ...p, label: label.slice(0, 24) } : p)) }));
  // 핀 자리: 묶인 카드가 움직였으면 지금 위치 기준
  const pinBox = (p: Pin): Box => {
    const boxes = p.items.map((id) => placed.get(id)).filter((x): x is Placed => !!x && !x.hidden);
    return boxes.length ? boundsOf(boxes.flatMap(rectPoly)) : p.box;
  };
  const endTour = () => { setTour(false); try { localStorage.setItem("albireo:board-tour:v1", "1"); } catch {} };

  // ─── 영역 → PNG · 웹진
  const regionBlob = async () => {
    if (!region) return null;
    return exportPNG({ board, placed, region, measure, pal: readPalette(wrapEl.current!), font: FONT });
  };
  const download = async () => {
    const blob = await regionBlob();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `albireo-canvas-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const insert = async () => {
    if (dialog?.kind !== "insert" || !userId) return;
    setDialog({ ...dialog, busy: true, err: null });
    try {
      const blob = await regionBlob();
      if (!blob) throw new Error("no region");
      const sb = supabaseBrowser();
      const path = `${userId}/canvas/${uid()}.png`;
      const { error } = await sb.storage.from("media").upload(path, blob, { contentType: "image/png" });
      if (error) throw error;
      const url = sb.storage.from("media").getPublicUrl(path).data.publicUrl;
      const r = await appendImage(dialog.article, url, dialog.caption);
      if (!r.ok) throw new Error(r.error);
      setDialog({ ...dialog, busy: false, done: dialog.article, err: null });
    } catch (err) {
      setDialog({ ...dialog, busy: false, err: (err as Error).message });
    }
  };
  // 필기 → 글자
  const ocr = async () => {
    const strokes = board.strokes.filter((s) => selStrokes.has(s.id));
    if (!strokes.length) return;
    setDialog({ kind: "ocr", text: "", busy: true, progress: 0, keep: false });
    const { recognize } = await import("./handwriting");
    try {
      const text = await recognize(strokes, lang, (p) => setDialog((d) => (d?.kind === "ocr" ? { ...d, progress: p } : d)));
      setDialog((d) => (d?.kind === "ocr" ? { ...d, text, busy: false } : d));
    } catch {
      setDialog((d) => (d?.kind === "ocr" ? { ...d, busy: false, text: "", err: true } : d));
    }
  };
  const placeOcr = () => {
    if (dialog?.kind !== "ocr" || !dialog.text.trim()) { setDialog(null); return; }
    const strokes = board.strokes.filter((s) => selStrokes.has(s.id));
    const bb = boundsOf(strokes.flatMap((s) => rectPoly(strokeBox(s))));
    const it: Item = { id: uid(), shape: "text", x: Math.round(bb.x), y: Math.round(bb.y), w: Math.max(120, Math.round(bb.w)), h: 40, text: dialog.text.trim(), tone: "ink" };
    commit({ ...board, items: [...board.items, it], strokes: dialog.keep ? board.strokes : board.strokes.filter((s) => !selStrokes.has(s.id)) });
    setDialog(null); setSel(new Set([it.id])); setSelStrokes(new Set()); setRegion(null);
  };

  // ─── 그리기 도우미
  const selBox = useMemo(() => {
    const boxes: Box[] = [...[...sel].map((id) => placed.get(id)).filter((p): p is Placed => !!p && !p.hidden), ...board.strokes.filter((s) => selStrokes.has(s.id)).map(strokeBox)];
    if (region) boxes.push(region.box);
    if (!boxes.length) return null;
    return boundsOf(boxes.flatMap(rectPoly));
  }, [sel, selStrokes, region, placed, board.strokes]);

  const spine = useMemo(() => {
    const ms = board.items.filter((i) => !i.parent && dateKey(i.date) !== null).sort((a, b) => dateKey(a.date)! - dateKey(b.date)!);
    if (ms.length < 2) return null;
    return ms.map((m) => { const p = placed.get(m.id)!; return `${p.x + 15},${p.y + p.h / 2}`; }).join(" ");
  }, [board.items, placed]);

  const live = drag?.t === "draw" ? inkPath(steady(drag.pts, pen.steady), pen.size, pen.steady, false) : "";
  const one = sel.size === 1 ? byId.get([...sel][0]) : undefined;
  const onePl = one ? placed.get(one.id) : undefined;
  const sbox = selBox ? { tl: screen({ x: selBox.x, y: selBox.y }), br: screen({ x: selBox.x + selBox.w, y: selBox.y + selBox.h }) } : null;
  const editIt = editing ? byId.get(editing) : undefined;
  const editPl = editing ? placed.get(editing) : undefined;
  const trayIt = tray ? byId.get(tray) : undefined;
  const trayPl = tray ? placed.get(tray) : undefined;
  const linkSel = selLink ? board.links.find((l) => l.id === selLink) : undefined;
  const cursor = tool === "hand" || space ? (drag?.t === "pan" ? "grabbing" : "grab") : tool === "pen" ? "crosshair" : tool === "eraser" ? "cell" : tool === "link" ? "alias" : "default";

  return (
    <div ref={wrapEl} className="bd" tabIndex={0} onKeyDown={onKey} onKeyUp={(e) => { if (e.key === " ") setSpace(false); }} aria-label={t("캔버스 보드", "Canvas board")}>
      <svg ref={svg} className="bd-svg" style={{ cursor }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDouble}>
        <defs>
          <pattern id="bd-dots" width={24} height={24} patternUnits="userSpaceOnUse"><circle cx={1} cy={1} r={1} className="bd-dot" /></pattern>
          <filter id="bd-shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.12" /></filter>
          {TONES.map((tn) => (
            <marker key={tn} id={`bd-arrow-${tn}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9Z" className={`bd-t-${tn} bd-arrowhead`} /></marker>
          ))}
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <rect x={-view.x / view.k} y={-view.y / view.k} width={4000 / view.k + 4000} height={3000 / view.k + 3000} fill="url(#bd-dots)" />
          {spine && <polyline points={spine} className="bd-spine" />}

          {/* 연결선 */}
          {board.links.map((l) => {
            const a = placed.get(l.from), b = placed.get(l.to);
            if (!a || !b || a.hidden || b.hidden) return null;
            const tone = byId.get(l.from)?.tone ?? "ink";
            const d = linkPath(a, b, l.kind);
            return (
              <g key={l.id} data-link={l.id} className={`bd-link bd-t-${tone}${selLink === l.id ? " on" : ""}`}>
                <path d={d} className="bd-link-hit" />
                <path d={d} className="bd-link-line" markerEnd={l.arrow ? `url(#bd-arrow-${tone})` : undefined} />
              </g>
            );
          })}
          {drag?.t === "link" && placed.get(drag.from) && <path d={`M${center(placed.get(drag.from)!).x} ${center(placed.get(drag.from)!).y}L${drag.p.x} ${drag.p.y}`} className="bd-link-ghost" />}

          {/* 카드 · 도형 */}
          {board.items.map((it) => {
            const p = placed.get(it.id);
            if (!p || p.hidden) return null;
            const kids = childrenOf(board.items, it.id).length;
            const dragging = drag?.t === "move" && drag.moved && drag.ids.includes(it.id);
            return (
              <ItemView key={it.id} it={it} p={p} kids={kids} selected={sel.has(it.id)} target={drop === it.id || (drag?.t === "link" && drag.over === it.id)} dragging={dragging} gulp={gulp === it.id} editing={editing === it.id} t={t} showHandles={sel.size === 1 && sel.has(it.id) && (tool === "select" || tool === "hand") && !drag} />
            );
          })}

          {/* 폴더 수납 모션 */}
          {ghosts.map((g) => (
            <g key={g.key} className="bd-ghost" style={{ ["--fx" as string]: `${g.to.x - g.box.w / 2}px`, ["--fy" as string]: `${g.to.y - g.box.h / 2}px`, transform: `translate(${g.box.x}px, ${g.box.y}px)` }}>
              <path d={shapePath(g.item.shape, { x: 0, y: 0, w: g.box.w, h: g.box.h })} className={`bd-shape bd-s-${g.item.shape} bd-t-${g.item.tone}`} />
            </g>
          ))}

          {/* 필기 */}
          {board.strokes.map((s) => <path key={s.id} d={strokePath(s)} fill={s.color} className={selStrokes.has(s.id) ? "bd-ink on" : "bd-ink"} />)}
          {live && <path d={live} fill={pen.color} className="bd-ink" />}

          {/* 핀 */}
          {(board.pins ?? []).map((p) => {
            const b = pinBox(p);
            return (
              <g key={p.id} className={`bd-pinned${selPin === p.id ? " on" : ""}`}>
                {p.poly && !p.items.length ? <polygon points={p.poly.map((q) => `${q.x},${q.y}`).join(" ")} className="bd-pin-area" /> : <rect x={b.x - 8} y={b.y - 8} width={b.w + 16} height={b.h + 16} rx={14} className="bd-pin-area" />}
                <g data-pin={p.id} className={`bd-pin${newPin === p.id ? " drop" : ""}`} transform={`translate(${b.x + b.w + 2} ${b.y - 6}) scale(${1 / Math.max(0.6, view.k)})`}>
                  <path d="M0 0 L-2 -14" className="bd-pin-needle" />
                  <circle cx={-2.5} cy={-19} r={7.5} className="bd-pin-head" />
                  <circle cx={-4.5} cy={-21} r={2.2} className="bd-pin-shine" />
                  <title>{p.label}</title>
                </g>
              </g>
            );
          })}

          {/* 선택 영역 */}
          {drag?.t === "marquee" && (() => { const r = boundsOf([drag.a, drag.b]); return <rect x={r.x} y={r.y} width={r.w} height={r.h} className="bd-marquee" />; })()}
          {drag?.t === "lasso" && <polyline points={drag.pts.map((q) => `${q.x},${q.y}`).join(" ")} className="bd-marquee" />}
          {region && !drag && (region.poly ? <polygon points={region.poly.map((q) => `${q.x},${q.y}`).join(" ")} className="bd-region" /> : <rect x={region.box.x} y={region.box.y} width={region.box.w} height={region.box.h} className="bd-region" />)}
        </g>
      </svg>

      {note && <p className="bd-note" role="status">{note}</p>}

      {/* 비었을 때 */}
      {!board.items.length && !board.strokes.length && (
        <p className="bd-empty"><span>{t("빈 곳을 두 번 눌러 카드 만들기", "Double-click to add a card")}</span><span>{t("P 펜 / L 연결 / Tab 가지 뻗기", "P pen / L link / Tab to branch")}</span></p>
      )}

      {/* 왼쪽 도구 */}
      <div className="bd-tools" role="toolbar" aria-label={t("도구", "Tools")}>
        {([["select", t("선택 (V)", "Select (V)"), "M5 3l12 7-5 1.5L9.5 17z"], ["hand", t("이동 (H / 스페이스)", "Pan (H / Space)"), "M8 13V6a1.5 1.5 0 013 0v5m0-6a1.5 1.5 0 013 0v6m0-4a1.5 1.5 0 013 0v6a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-4a1.5 1.5 0 012.5-1.5L8 15"],
          ["pen", t("펜 (P)", "Pen (P)"), "M4 16l2.5-.5L16 6l-2-2-9.5 9.5zM13 5l2 2"], ["eraser", t("지우개 (E)", "Eraser (E)"), "M4 13l7-7 5 5-5 5H7zM9 16h8"], ["link", t("연결 (L)", "Link (L)"), "M8 12a3 3 0 010-4l2-2a3 3 0 014 4l-1 1M12 8a3 3 0 010 4l-2 2a3 3 0 01-4-4l1-1"]] as [Tool, string, string][]).map(([k, label, d]) => (
          <button key={k} type="button" aria-pressed={tool === k} title={label} aria-label={label} onClick={() => setTool(k)}><svg viewBox="0 0 20 20"><path d={d} /></svg></button>
        ))}
        <span className="bd-sep" />
        <button type="button" title={t("도형 추가", "Add shape")} aria-label={t("도형 추가", "Add shape")} aria-expanded={shapeMenu} onClick={() => setShapeMenu((v) => !v)}><svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" /></svg></button>
        <button type="button" title={t("폴더", "Folder")} aria-label={t("폴더 만들기", "New folder")} onClick={() => create("folder")}><svg viewBox="0 0 20 20"><path d="M3 6.5V15h14V7.5H9.5L8 5.5H4z" /></svg></button>
        {tool === "select" && (
          <>
            <span className="bd-sep" />
            <button type="button" aria-pressed={selMode === "rect"} title={t("사각 선택", "Rectangle select")} aria-label={t("사각 선택", "Rectangle select")} onClick={() => setSelMode("rect")}><svg viewBox="0 0 20 20"><rect x="4" y="5" width="12" height="10" strokeDasharray="2 2" /></svg></button>
            <button type="button" aria-pressed={selMode === "lasso"} title={t("올가미 선택", "Lasso select")} aria-label={t("올가미 선택", "Lasso select")} onClick={() => setSelMode("lasso")}><svg viewBox="0 0 20 20"><path d="M6 13c-3-2-2-8 5-8s7 6 2 7.5c-2 .6-4 .2-5-.5M6 13c-1 1-1 3 1 3" strokeDasharray="2 2" /></svg></button>
          </>
        )}
      </div>

      {shapeMenu && (
        <div className="bd-shapes" role="menu">
          {SHAPES.map((s) => (
            <button key={s} type="button" role="menuitem" onClick={() => create(s)} title={t(...SHAPE_NAME[s])}>
              <svg viewBox="0 0 44 30"><path d={shapePath(s, { x: 4, y: 4, w: 36, h: 22 })} /></svg>
              <span>{t(...SHAPE_NAME[s])}</span>
            </button>
          ))}
        </div>
      )}

      {/* 펜 설정 */}
      {(tool === "pen" || tool === "eraser") && (
        <div className="bd-pen">
          {tool === "pen" ? (
            <>
              <div className="bd-swatches">
                {PALETTE.map((c) => <button key={c} type="button" style={{ background: c }} aria-label={c} aria-pressed={pen.color === c} onClick={() => setPen({ ...pen, color: c })} />)}
                <label className="bd-custom" title={t("직접 고르기", "Custom")} style={{ background: PALETTE.includes(pen.color) ? undefined : pen.color }}>
                  <input type="color" value={pen.color} onChange={(e) => setPen({ ...pen, color: e.target.value })} aria-label={t("펜 색 직접 고르기", "Custom pen color")} />
                </label>
              </div>
              <label className="bd-range"><span>{t("굵기", "Size")}</span><input type="range" min={1} max={24} value={pen.size} onChange={(e) => setPen({ ...pen, size: Number(e.target.value) })} /><b>{pen.size}</b></label>
              <label className="bd-range"><span>{t("손떨림 보정", "Stabilizer")}</span><input type="range" min={0} max={100} value={Math.round(pen.steady * 100)} onChange={(e) => setPen({ ...pen, steady: Number(e.target.value) / 100 })} /><b>{pen.steady === 0 ? t("끔", "off") : Math.round(pen.steady * 100)}</b></label>
            </>
          ) : (
            <p>{t("획을 문질러 지웁니다", "Scrub over strokes to erase")}</p>
          )}
        </div>
      )}

      {/* 오른쪽 위 */}
      <div className="bd-top">
        <button type="button" onClick={undo} disabled={!past.current.length} title={t("실행 취소 (Ctrl+Z)", "Undo (Ctrl+Z)")} aria-label="Undo">↶</button>
        <button type="button" onClick={redo} disabled={!future.current.length} title={t("다시 실행", "Redo")} aria-label="Redo">↷</button>
        <span className="bd-sep" />
        <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <button type="button" className="bd-zoom" onClick={fit} title={t("전체 보기", "Fit")}>{Math.round(view.k * 100)}%</button>
        <button type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
        <span className="bd-sep" />
        <div className="bd-menu-wrap">
          <button type="button" className="bd-text" aria-expanded={arrange} onClick={() => setArrange((v) => !v)}>{t("정렬", "Arrange")} ▾</button>
          {arrange && (
            <div className="bd-menu" role="menu">
              <button type="button" role="menuitem" onClick={runAuto}><b>{t("자동 정렬", "Auto arrange")}</b><span>{t("연결 묶음은 트리로, 나머지는 격자로", "Trees for linked cards, a grid for the rest")}</span></button>
              <button type="button" role="menuitem" onClick={() => runCenter()}><b>{t("중앙 정렬", "Centre on")}</b><span>{t("고른 카드 / 핀을 가운데 두고 둘레에", "Arrange around the selected card or pin")}</span></button>
              <button type="button" role="menuitem" onClick={runMindmap}><b>{t("마인드맵", "Mind map")}</b><span>{t("선택한 카드에서 가지 뻗기", "Branch from the selected card")}</span></button>
              <button type="button" role="menuitem" onClick={runTimetree}><b>{t("타임트리", "Time tree")}</b><span>{t("날짜 있는 사건을 시간순으로", "Lay dated milestones on a time axis")}</span></button>
            </div>
          )}
        </div>
        <div className="bd-menu-wrap">
          <button type="button" className="bd-text" aria-expanded={pinMenu} onClick={() => setPinMenu((v) => !v)} title={t("핀으로 돌아가기", "Go to a pin")}>📍 {board.pins?.length ?? 0}</button>
          {pinMenu && (
            <div className="bd-menu" role="menu">
              {(board.pins ?? []).length ? (board.pins ?? []).map((p) => (
                <button key={p.id} type="button" role="menuitem" onClick={() => { setPinMenu(false); clearSel(); setSelPin(p.id); flyTo(pinBox(p)); }}>
                  <b>📍 {p.label}</b><span>{p.items.length ? t(`카드 ${p.items.length}개 고정`, `${p.items.length} cards pinned`) : t("올가미 영역", "Lasso area")}</span>
                </button>
              )) : <p className="bd-menu-empty">{t("아직 핀이 없습니다. 카드나 영역을 고른 뒤 ‘핀 꽂기’를 누르세요.", "No pins yet. Select cards or an area, then ‘Pin’.")}</p>}
            </div>
          )}
        </div>
        <button type="button" className="bd-help" onClick={() => setTour(true)} title={t("사용법 다시 보기", "Show the tour")} aria-label={t("사용법", "Help")}>?</button>
      </div>

      {/* 선택 도구 막대 */}
      {sbox && !drag && !editing && (sel.size > 0 || selStrokes.size > 0 || region) && (
        <div className="bd-ctx" style={{ left: Math.min(Math.max(190, (sbox.tl.x + sbox.br.x) / 2), (wrapEl.current?.clientWidth ?? 800) - 190), top: Math.max(56, sbox.tl.y - 12) }}>
          {sel.size > 0 && (
            <>
              {TONES.map((tn) => <button key={tn} type="button" className={`bd-tone bd-t-${tn}`} aria-label={tn} aria-pressed={one?.tone === tn} onClick={() => patchItems(sel, { tone: tn })} />)}
              <span className="bd-sep" />
              {one && one.shape !== "folder" && (
                <select value={one.shape} onChange={(e) => patchItems(sel, { shape: e.target.value as Shape })} aria-label={t("모양", "Shape")}>
                  {SHAPES.filter((s) => s !== "folder").map((s) => <option key={s} value={s}>{t(...SHAPE_NAME[s])}</option>)}
                </select>
              )}
              {one?.shape === "milestone" && <input className="bd-date" value={one.date ?? ""} placeholder="1987-05" onChange={(e) => setBoard({ ...board, items: board.items.map((i) => (i.id === one.id ? { ...i, date: e.target.value.slice(0, 16) } : i)) })} onBlur={() => onChange(boardRef.current)} aria-label={t("날짜", "Date")} />}
              {sel.size > 1 && <button type="button" className="bd-text" onClick={group}>{t("카드로 묶기", "Group")}</button>}
              {one && one.parent && <button type="button" className="bd-text" onClick={() => { const pl = placed.get(one.id)!; commit({ ...board, items: board.items.map((i) => (i.id === one.id ? { ...i, parent: null, x: pl.x + 40, y: pl.y + 20 } : i)) }); }}>{t("꺼내기", "Take out")}</button>}
            </>
          )}
          {selStrokes.size > 0 && <button type="button" className="bd-text" onClick={ocr}>{t("필기 → 글자", "Ink → text")}</button>}
          {region && (
            <>
              <button type="button" className="bd-text" onClick={download}>PNG</button>
              <button type="button" className="bd-text" onClick={() => setDialog({ kind: "insert", article: articles[0]?.id ?? "", caption: "", busy: false, done: null, err: null })}>{t("웹진에 넣기", "Add to article")}</button>
            </>
          )}
          {(sel.size > 0 || region) && <button type="button" className="bd-text" onClick={pinSelection}>📍 {t("핀 꽂기", "Pin")}</button>}
          {(sel.size > 0 || selStrokes.size > 0) && <button type="button" className="bd-del" onClick={removeSelected} aria-label={t("삭제", "Delete")}>✕</button>}
        </div>
      )}
      {/* 고른 핀 */}
      {selPin && !drag && (() => {
        const p = (board.pins ?? []).find((x) => x.id === selPin);
        if (!p) return null;
        const b = pinBox(p);
        const s2 = screen({ x: b.x + b.w / 2, y: b.y });
        return (
          <div className="bd-ctx" style={{ left: Math.min(Math.max(200, s2.x), (wrapEl.current?.clientWidth ?? 800) - 200), top: Math.max(56, s2.y - 30) }}>
            <input className="bd-pin-name" value={p.label} onChange={(e) => renamePin(p.id, e.target.value)} onBlur={() => onChange(boardRef.current)} aria-label={t("핀 이름", "Pin name")} />
            <button type="button" className="bd-text" onClick={() => flyTo(b)}>{t("이동", "Go")}</button>
            {p.items[0] && <button type="button" className="bd-text" onClick={() => runCenter(p.items[0])}>{t("중앙 정렬", "Centre")}</button>}
            <button type="button" className="bd-del" onClick={() => unpin(p.id)}>{t("핀 뽑기", "Unpin")}</button>
          </div>
        );
      })()}
      {linkSel && !drag && (() => {
        const a = placed.get(linkSel.from), b = placed.get(linkSel.to);
        if (!a || !b) return null;
        const m = screen({ x: (center(a).x + center(b).x) / 2, y: (center(a).y + center(b).y) / 2 });
        const set = (p: Partial<typeof linkSel>) => commit({ ...board, links: board.links.map((l) => (l.id === linkSel.id ? { ...l, ...p } : l)) });
        return (
          <div className="bd-ctx" style={{ left: m.x, top: m.y - 18 }}>
            {(["curve", "line", "elbow"] as LinkKind[]).map((k) => <button key={k} type="button" className="bd-text" aria-pressed={linkSel.kind === k} onClick={() => set({ kind: k })}>{k === "curve" ? t("곡선", "Curve") : k === "line" ? t("직선", "Straight") : t("꺾은선", "Elbow")}</button>)}
            <button type="button" className="bd-text" aria-pressed={!!linkSel.arrow} onClick={() => set({ arrow: !linkSel.arrow })}>→</button>
            <button type="button" className="bd-del" onClick={removeSelected} aria-label={t("삭제", "Delete")}>✕</button>
          </div>
        );
      })()}

      {/* 글자 고치기 */}
      {editIt && editPl && (
        <textarea
          className={`bd-edit bd-edit-${editIt.shape}`}
          ref={(el) => { editRef.current = el; if (el && document.activeElement !== el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); } }}
          defaultValue={editIt.text}
          style={{
            left: view.x + editPl.x * view.k, top: view.y + editPl.y * view.k, width: editPl.w * view.k,
            minHeight: Math.min(editPl.h, 160) * view.k, fontSize: FONT_SIZE(editIt.shape) * view.k,
            padding: `${PAD * view.k}px`, lineHeight: LINE,
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) { (e.target as HTMLTextAreaElement).blur(); }
            e.stopPropagation();
          }}
          onBlur={finishEdit}
        />
      )}

      {/* 폴더 속 */}
      {trayIt && trayPl && (() => {
        const kids = childrenOf(board.items, trayIt.id);
        const s = screen({ x: trayPl.x, y: trayPl.y + trayPl.h });
        return (
          <div className="bd-tray" style={{ left: s.x, top: s.y + 10 }}>
            <p className="bd-tray-k">{trayIt.text || t("폴더", "Folder")} ({kids.length})</p>
            {kids.length ? kids.map((c) => (
              <button key={c.id} type="button" className={`bd-tray-card bd-t-${c.tone}`} onPointerDown={(e) => takeOut(e, c.id)} title={t("끌어서 꺼내기", "Drag out")}>
                <i />{c.text || t(...SHAPE_NAME[c.shape])}
              </button>
            )) : <p className="bd-tray-empty">{t("카드를 끌어다 넣으세요", "Drag cards in")}</p>}
            <div className="bd-tray-foot">
              <button type="button" onClick={() => { setEditing(trayIt.id); setTray(null); }}>{t("이름 바꾸기", "Rename")}</button>
            </div>
          </div>
        );
      })()}

      {tour && <Tour onDone={endTour} />}

      {/* 대화 상자 */}
      {dialog?.kind === "ocr" && (
        <div className="bd-dialog" role="dialog" aria-label={t("필기 인식", "Handwriting recognition")}>
          <p className="bd-dialog-k">{t("필기 → 글자", "Ink → text")}</p>
          {dialog.busy ? (
            <p className="dim">{t("인식하는 중…", "Recognising…")} {dialog.progress ? `${Math.round(dialog.progress * 100)}%` : ""}<br /><small>{t("처음 한 번은 언어 데이터를 내려받느라 조금 걸립니다.", "The first run downloads language data.")}</small></p>
          ) : (
            <>
              {dialog.err && <p className="error-text">{t("인식하지 못했습니다. 인터넷 연결을 확인하거나 직접 입력해 주십시오.", "Recognition failed. Check your connection or type it in.")}</p>}
              <textarea className="input" rows={3} value={dialog.text} onChange={(e) => setDialog({ ...dialog, text: e.target.value })} placeholder={t("인식된 글자가 없습니다. 직접 고쳐 쓰셔도 됩니다.", "Nothing recognised. You can type it here.")} />
              <label className="bd-check"><input type="checkbox" checked={dialog.keep} onChange={(e) => setDialog({ ...dialog, keep: e.target.checked })} />{t("필기는 남겨 두기", "Keep the ink")}</label>
            </>
          )}
          <div className="bd-dialog-row">
            <button type="button" className="btn btn-sm" onClick={() => setDialog(null)}>{t("취소", "Cancel")}</button>
            <button type="button" className="btn btn-sm btn-gold" disabled={dialog.busy} onClick={placeOcr}>{t("글자로 넣기", "Insert text")}</button>
          </div>
        </div>
      )}
      {dialog?.kind === "insert" && (
        <div className="bd-dialog" role="dialog" aria-label={t("웹진에 넣기", "Add to article")}>
          <p className="bd-dialog-k">{t("선택 영역을 원고에 넣기", "Add the selection to a manuscript")}</p>
          {!canvasId || !userId ? (
            <p className="dim">{t("체험 모드에서는 PNG로만 저장할 수 있습니다.", "In demo mode you can only save a PNG.")}</p>
          ) : dialog.done ? (
            <p>{t("원고 끝에 이미지를 넣었습니다.", "Added to the end of the manuscript.")} <a href={`/studio/articles/${dialog.done}`} className="u">{t("원고 열기", "Open manuscript")} →</a></p>
          ) : (
            <>
              <select className="input" value={dialog.article} onChange={(e) => setDialog({ ...dialog, article: e.target.value })} aria-label={t("원고", "Manuscript")}>
                {articles.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
              <input className="input" value={dialog.caption} maxLength={120} placeholder={t("그림 설명 (선택)", "Caption (optional)")} onChange={(e) => setDialog({ ...dialog, caption: e.target.value })} />
              {dialog.err && <p className="error-text">{dialog.err}</p>}
            </>
          )}
          <div className="bd-dialog-row">
            <button type="button" className="btn btn-sm" onClick={() => setDialog(null)}>{dialog.done ? t("닫기", "Close") : t("취소", "Cancel")}</button>
            {canvasId && userId && !dialog.done && <button type="button" className="btn btn-sm btn-gold" disabled={dialog.busy || !dialog.article} onClick={insert}>{dialog.busy ? t("넣는 중…", "Adding…") : t("넣기", "Add")}</button>}
          </div>
        </div>
      )}

      {onePl && one && tool === "select" && !drag && !editing && one.shape === "folder" && !tray && (
        <span className="bd-hint" style={{ left: screen({ x: onePl.x, y: onePl.y }).x, top: screen({ x: onePl.x, y: onePl.y + onePl.h }).y + 8 }}>{t("눌러서 열기 / 카드를 끌어 넣기", "Click to open / drag cards in")}</span>
      )}
    </div>
  );
}

// ─── 카드 하나
function ItemView({ it, p, kids, selected, target, dragging, gulp, editing, showHandles, t }: {
  it: Item; p: Placed; kids: number; selected: boolean; target: boolean; dragging: boolean; gulp: boolean; editing: boolean; showHandles: boolean; t: (ko: string, en: string) => string;
}) {
  const box = { x: 0, y: 0, w: p.w, h: p.h };
  const fs = FONT_SIZE(it.shape);
  const lines = wrap(it.text, textWidth({ shape: it.shape, w: p.w }), fs, measure);
  const centered = ["pill", "ellipse", "diamond", "hex"].includes(it.shape);
  const open = isContainer(it.shape) && it.shape !== "folder" && kids > 0 && !it.collapsed;
  let ty = it.shape === "milestone" ? 36 : centered ? p.h / 2 - ((lines.length - 1) * fs * LINE) / 2 + fs * 0.35 : PAD + fs;
  if (it.shape === "card" && !open) ty = p.h / 2 - ((lines.length - 1) * fs * LINE) / 2 + fs * 0.35;
  if (it.shape === "folder") ty = 40;
  if (open) ty = PAD + fs;
  const tx = centered ? p.w / 2 : it.shape === "milestone" ? 30 : PAD;
  return (
    <g
      data-id={it.id}
      className={`bd-item bd-t-${it.tone}${selected ? " sel" : ""}${target ? " drop" : ""}${dragging ? " drag" : ""}${gulp ? " gulp" : ""}${p.inset ? " inset" : ""}`}
      style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
    >
      <path d={shapePath(it.shape, box)} className={`bd-shape bd-s-${it.shape}`} filter={it.shape === "text" || p.inset ? undefined : "url(#bd-shadow)"} />
      {it.shape === "note" && <path d={`M${p.w - 16} ${p.h}V${p.h - 16}H${p.w}`} className="bd-fold" />}
      {it.shape === "card" && it.tone !== "ink" && <rect x={0} y={10} width={3} height={Math.min(28, p.h - 20)} rx={1.5} className="bd-accent" />}
      {it.shape === "milestone" && (<><circle cx={15} cy={p.h / 2} r={5} className="bd-mdot" /><text x={30} y={18} className="bd-date-t">{it.date}</text></>)}
      {it.shape === "folder" && <text x={p.w - 12} y={p.h - 12} textAnchor="end" className="bd-count">{kids}</text>}
      {!editing && (
        <text x={tx} y={ty} textAnchor={centered ? "middle" : "start"} className={`bd-label${it.shape === "text" ? " big" : ""}`} style={{ fontSize: fs }}>
          {lines.map((ln, i) => <tspan key={i} x={tx} dy={i ? fs * LINE : 0}>{ln || " "}</tspan>)}
        </text>
      )}
      {!it.text && !editing && <text x={tx} y={ty} textAnchor={centered ? "middle" : "start"} className="bd-ph" style={{ fontSize: fs }}>{it.shape === "folder" ? t("폴더", "Folder") : t("두 번 눌러 쓰기", "Double-click to write")}</text>}
      {kids > 0 && it.shape !== "folder" && (
        <g data-handle="toggle" data-of={it.id} className="bd-toggle" transform={`translate(${p.w - 22} 8)`}>
          <rect width={16} height={16} rx={4} />
          <path d={it.collapsed ? "M6 4l4 4-4 4" : "M4 6l4 4 4-4"} />
          {it.collapsed && <text x={-4} y={12} textAnchor="end">{kids}</text>}
        </g>
      )}
      {selected && <path d={shapePath(it.shape, { x: -4, y: -4, w: p.w + 8, h: p.h + 8 })} className="bd-ring" />}
      {showHandles && (
        <>
          <g data-handle="link" data-of={it.id} className="bd-h-link" transform={`translate(${p.w + 14} ${p.h / 2})`}><circle r={9} /><path d="M-3.5 0h7M0 -3.5v7" /></g>
          {!p.inset && <rect data-handle="resize" data-of={it.id} className="bd-h-size" x={p.w - 5} y={p.h - 5} width={10} height={10} rx={2} />}
        </>
      )}
    </g>
  );
}
