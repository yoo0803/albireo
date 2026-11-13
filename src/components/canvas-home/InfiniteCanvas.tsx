"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

export type Tile = { id: string; x: number; y: number; w: number; h: number; node: ReactNode; label?: string };
export type Layout = { tiles: Tile[]; chunk: { w: number; h: number }; focus?: { x: number; y: number } };

type Props = {
  // 고정 배치 또는 화면 크기 기반 배치 (클라이언트 계산)
  layout?: Layout;
  build?: (vw: number, vh: number) => Layout;
  placeholder?: ReactNode; // 배치 전 (SSR) 화면
  wrap?: boolean; // false: 반복 없는 한 장 (가장자리에서 멈춤)
  zoom0?: number; // 시작 배율 (모바일 0.6배)
  overlay?: ReactNode;
  className?: string;
};

const Z_MIN = 0.35, Z_MAX = 1.6, FRICTION = 0.92, DRIFT = 0.12; // px/frame
const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

// 무한 캔버스: 드래그 · 관성 · 휠 · 핀치 확대
export function InfiniteCanvas({ layout: fixed, build, placeholder, overlay, className, wrap = true, zoom0 }: Props) {
  const t = useT();
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const [built, setBuilt] = useState<(Layout & { vw: number; vh: number }) | null>(null);
  const layout = fixed ?? built;
  const chunk = layout?.chunk ?? { w: 1, h: 1 };
  const fx = layout?.focus?.x ?? chunk.w / 2, fy = layout?.focus?.y ?? chunk.h / 2;

  const pan = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);
  const drag = useRef<{ id: number; x: number; y: number; moved: number; t: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const idle = useRef(true);
  const [grid, setGrid] = useState({ cols: 1, rows: 1 });
  const [z, setZ] = useState(1);
  const [primary, setPrimary] = useState("0-0");
  const [explored, setExplored] = useState(false); // 한 번 둘러본 뒤 안내 숨김
  const reduce = useRef(false);
  const blur = useRef(0);
  const fine = useRef(false);

  // 화면 크기 기반 배치 (가로 변화 · 큰 세로 변화 때만 재배치)
  useEffect(() => {
    if (!build) return;
    const el = stage.current;
    if (!el) return;
    let last = { w: 0, h: 0 };
    const run = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w === last.w && Math.abs(h - last.h) < 120) return;
      last = { w, h };
      setBuilt({ ...build(w, h), vw: w, vh: h });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    return () => ro.disconnect();
  }, [build]);

  // 화면 크기 → 복제 수
  const measure = useCallback(() => {
    const el = stage.current;
    if (!el || chunk.w < 2) return;
    const cols = Math.ceil(el.clientWidth / (chunk.w * zoom.current)) + 1;
    const rows = Math.ceil(el.clientHeight / (chunk.h * zoom.current)) + 1;
    setGrid((g) => (g.cols === cols && g.rows === rows ? g : { cols, rows }));
  }, [chunk.w, chunk.h]);

  // 렌더 루프: 관성 · 유휴 표류 · 래핑
  useEffect(() => {
    if (chunk.w < 2) return;
    reduce.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    fine.current = matchMedia("(pointer: fine)").matches;
    // 시작 배율 · 초점 (화면 크기 배치는 원래 크기)
    const el = stage.current;
    if (el) {
      zoom.current = zoom0 ? (el.clientWidth < 640 ? zoom0 * 0.6 : zoom0) : build ? 1 : el.clientWidth < 640 ? 0.62 : 0.92;
      setZ(zoom.current);
      pan.current.x = el.clientWidth / 2 - fx * zoom.current;
      pan.current.y = el.clientHeight / 2 - fy * zoom.current;
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (stage.current) ro.observe(stage.current);
    let raf = 0;
    let cur = "";
    const tick = () => {
      if (!drag.current) {
        pan.current.x += vel.current.x;
        pan.current.y += vel.current.y;
        vel.current.x *= FRICTION;
        vel.current.y *= FRICTION;
        if (Math.abs(vel.current.x) < 0.02 && Math.abs(vel.current.y) < 0.02) {
          vel.current = { x: 0, y: 0 };
          if (idle.current && !reduce.current && !build && wrap) { pan.current.x -= DRIFT; pan.current.y -= DRIFT * 0.45; }
        }
      }
      const W = chunk.w * zoom.current, H = chunk.h * zoom.current;
      const s0 = stage.current;
      if (!wrap && s0) {
        // 한 장: 화면 중앙이 판 밖으로 나가지 않게
        const cw = s0.clientWidth, ch = s0.clientHeight;
        pan.current.x = Math.min(cw / 2, Math.max(cw / 2 - W, pan.current.x));
        pan.current.y = Math.min(ch / 2, Math.max(ch / 2 - H, pan.current.y));
      }
      const ox = wrap ? ((pan.current.x % W) + W) % W - W : pan.current.x;
      const oy = wrap ? ((pan.current.y % H) + H) % H - H : pan.current.y;
      const s = stage.current;
      if (world.current && s) {
        world.current.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${zoom.current})`;
        // 화면 중앙 사본 = 주 사본 (보조기기 · 탭 순서)
        const key = wrap ? `${Math.floor((s.clientWidth / 2 - ox) / W)}-${Math.floor((s.clientHeight / 2 - oy) / H)}` : "0-0";
        if (key !== cur) { cur = key; setPrimary(key); }
        // 빠른 이동 시 잔상 흐림 (데스크톱)
        if (fine.current && !reduce.current) {
          const sp = Math.hypot(vel.current.x, vel.current.y);
          const b = Math.min(2, Math.max(0, (sp - 12) / 12));
          if (Math.abs(b - blur.current) > 0.15) { blur.current = b; world.current.style.filter = b > 0.2 ? `blur(${b.toFixed(1)}px)` : ""; }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [chunk.w, chunk.h, measure, fx, fy, build, wrap, zoom0]);

  // 주 사본 밖 요소: 탭 순서 제외 (지연 마운트 포함)
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    const apply = () => {
      w.querySelectorAll<HTMLElement>(".canvas-chunk").forEach((c) => {
        const main = c.dataset.copy === primary;
        c.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((n) => {
          if (!main) { if (n.getAttribute("tabindex") !== "-1") { n.dataset.tab = n.getAttribute("tabindex") ?? ""; n.setAttribute("tabindex", "-1"); } }
          else if (n.dataset.tab !== undefined) { if (n.dataset.tab) n.setAttribute("tabindex", n.dataset.tab); else n.removeAttribute("tabindex"); delete n.dataset.tab; }
        });
      });
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(w, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [primary, grid, layout]);

  const setZoom = (next: number, cx?: number, cy?: number) => {
    const el = stage.current;
    if (!el) return;
    const nz = Math.min(Z_MAX, Math.max(Z_MIN, next));
    const r = el.getBoundingClientRect();
    const px = (cx ?? r.left + r.width / 2) - r.left, py = (cy ?? r.top + r.height / 2) - r.top;
    // 커서 기준 확대
    pan.current.x = px - ((px - pan.current.x) * nz) / zoom.current;
    pan.current.y = py - ((py - pan.current.y) * nz) / zoom.current;
    zoom.current = nz;
    setZ(nz);
    measure();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    idle.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom.current };
      drag.current = null;
      return;
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
    vel.current = { x: 0, y: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setZoom((pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.moved > 40 && !explored) setExplored(true);
    if (d.moved > 6 && !stage.current?.hasPointerCapture(e.pointerId)) stage.current?.setPointerCapture(e.pointerId);
    pan.current.x += dx;
    pan.current.y += dy;
    const now = performance.now(), dt = Math.max(1, now - d.t);
    vel.current = { x: (dx / dt) * 16, y: (dy / dt) * 16 };
    d.x = e.clientX; d.y = e.clientY; d.t = now;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      // 드래그 후 클릭 무시
      if (d.moved > 6) stage.current?.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
      drag.current = null;
    }
  };

  // 휠: 이동 · ctrl/트랙패드 핀치: 확대
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      idle.current = false;
      if (e.ctrlKey) setZoom(zoom.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
      else { pan.current.x -= e.deltaX; pan.current.y -= e.deltaY; vel.current = { x: 0, y: 0 }; }
      setExplored(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 240 : 80;
    const m: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (m[e.key]) { e.preventDefault(); idle.current = false; vel.current = { x: m[e.key][0] / 8, y: m[e.key][1] / 8 }; setExplored(true); }
    if (e.key === "+" || e.key === "=") setZoom(zoom.current * 1.15);
    if (e.key === "-") setZoom(zoom.current / 1.15);
  };

  // 포커스된 타일을 화면 안으로
  const onFocus = (e: React.FocusEvent) => {
    const el = stage.current;
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    if (!el || !target) return;
    const a = target.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (a.width > r.width || a.height > r.height) return;
    if (a.left < r.left + 40 || a.right > r.right - 40 || a.top < r.top + 80 || a.bottom > r.bottom - 80) {
      pan.current.x += r.left + r.width / 2 - (a.left + a.width / 2);
      pan.current.y += r.top + r.height / 2 - (a.top + a.height / 2);
    }
  };

  // 화면 크기 배치: 첫 칠하기부터 초점 맞춤 (하위 요소 측정용)
  const init = built && !fixed
    ? `translate3d(${((((built.vw / 2 - fx) % chunk.w) + chunk.w) % chunk.w) - chunk.w}px, ${((((built.vh / 2 - fy) % chunk.h) + chunk.h) % chunk.h) - chunk.h}px, 0) scale(1)`
    : undefined;

  const copies: [number, number][] = [];
  if (layout && !wrap) copies.push([0, 0]);
  else if (layout) for (let j = 0; j < grid.rows + 1; j++) for (let i = 0; i < grid.cols + 1; i++) copies.push([i, j]);

  return (
    <div
      ref={stage}
      className={`canvas-stage ${className ?? ""}`}
      data-explored={explored || undefined}
      tabIndex={0}
      role="region"
      aria-label={t("자유 캔버스: 끌거나 방향키로 이동, +/- 확대", "Free canvas: drag or use arrow keys, +/- to zoom")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKey}
      onFocus={onFocus}
    >
      <div ref={world} className="canvas-world" style={init ? { transform: init } : undefined}>
        {copies.map(([i, j]) => {
          const main = `${i}-${j}` === primary;
          return (
            <div
              key={`${i}-${j}`}
              className="canvas-chunk"
              data-copy={`${i}-${j}`}
              style={{ left: i * chunk.w, top: j * chunk.h, width: chunk.w, height: chunk.h }}
              aria-hidden={main ? undefined : true}
            >
              {layout!.tiles.map((tl) => (
                <div
                  key={tl.id}
                  className="canvas-tile"
                  data-tile
                  data-id={tl.id}
                  style={{
                    left: tl.x, top: tl.y, width: tl.w, height: tl.h,
                    // 등장 순서: 초점에서 먼 순
                    ["--d" as string]: `${Math.min(900, Math.round(Math.hypot(tl.x + tl.w / 2 - fx, tl.y + tl.h / 2 - fy) * 0.6))}ms`,
                  }}
                >
                  {tl.node}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      {!layout && placeholder && <div className="canvas-placeholder">{placeholder}</div>}
      {overlay}
      <div className="canvas-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => setZoom(zoom.current / 1.2)} aria-label={t("축소", "Zoom out")}>−</button>
        <button type="button" onClick={() => setZoom(1)} aria-label={t("원래 크기", "Reset zoom")}>{Math.round(z * 100)}%</button>
        <button type="button" onClick={() => setZoom(zoom.current * 1.2)} aria-label={t("확대", "Zoom in")}>+</button>
      </div>
    </div>
  );
}
