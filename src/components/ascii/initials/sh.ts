// SH · Chemistry: 흩어진 원자가 결합해 이니셜 분자 구조
import { Grid, palette } from "ascii-magic-art/lib/kit.js";
import { COLS, ROWS, layout, hash, cycle, ease, clamp01 } from "./font";

export const meta = {
  slug: "initials-sh",
  name: "SH · molecule",
  cols: COLS,
  rows: ROWS,
  fps: 20,
  // 0 밝은 청록 · 1 청록 · 2 결합 · 3 기포 · 4 전자(주황) · 5 라벨
  palette: palette(["#e6fbf5", "#5fd4b8", "#62c9b0", "#24524a", "#ffb36b", "#a9e6d6"]),
};

const PER = 10;
const FORMULAS = ["H2O", "NaCl", "C6H12O6", "CO2", "NH3"];

type Atom = { x: number; y: number; sx: number; sy: number; stroke: number; big: boolean };

export default function create() {
  const g = new Grid(COLS, ROWS);
  const L = layout("SH");

  // 획마다 일정 간격 원자 배치
  const atoms: Atom[] = [];
  L.strokes.forEach((s, si) => {
    let acc = 99;
    for (let i = 1; i < s.length; i++) {
      const [ax, ay] = s[i - 1];
      const [bx, by] = s[i];
      const len = Math.hypot(bx - ax, (by - ay) * 1.66);
      for (let d = 0; d < len; d += 0.5) {
        acc += 0.5;
        if (acc < 4.2) continue;
        acc = 0;
        const f = d / len;
        const x = ax + (bx - ax) * f;
        const y = ay + (by - ay) * f;
        const k = atoms.length;
        const a = hash(k, 7) * Math.PI * 2;
        const r = 22 + hash(k, 8) * 10;
        atoms.push({ x, y, sx: COLS / 2 + Math.cos(a) * r, sy: ROWS / 2 + Math.sin(a) * r * 0.6, stroke: si, big: hash(k, 9) > 0.7 });
      }
    }
    const [ex, ey] = s[s.length - 1];
    atoms.push({ x: ex, y: ey, sx: ex, sy: -4, stroke: si, big: true });
  });

  const bond = (ax: number, ay: number, bx: number, by: number) => {
    const sl = ((by - ay) * 1.66) / (bx - ax || 0.001);
    const ch = Math.abs(sl) < 0.45 ? "─" : Math.abs(sl) > 2.8 ? "│" : sl > 0 ? "╲" : "╱";
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay) * 1.66);
    for (let s = 1; s < n; s++) g.set(ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n, ch, "2");
  };

  return (t: number) => {
    g.clear();
    const { lt, fade } = cycle(t, PER);

    // 기포
    for (let i = 0; i < 18; i++) {
      const y = ROWS - (((t * (1.5 + hash(i, 1) * 2) + hash(i, 2) * ROWS) % (ROWS + 4)));
      const x = hash(i, 3) * COLS + Math.sin(t * 1.3 + i) * 1.5;
      g.set(x, y, hash(i, 4) > 0.6 ? "o" : hash(i, 4) > 0.3 ? "°" : ".", "3");
    }

    // 원자 이동
    const pos = atoms.map((a, k) => {
      const p = ease(clamp01((lt - 0.4 - (k / atoms.length) * 1.2) / 2.2));
      return { ...a, px: a.sx + (a.x - a.sx) * p, py: a.sy + (a.y - a.sy) * p, settled: p >= 1 };
    });

    // 결합
    for (let k = 1; k < pos.length; k++) {
      const a = pos[k - 1];
      const b = pos[k];
      if (a.stroke !== b.stroke || !a.settled || !b.settled) continue;
      if (lt < 3.6 + (k / pos.length) * 1.2 || hash(k, 11) > fade) continue;
      bond(a.px, a.py, b.px, b.py);
    }
    // 원자
    pos.forEach((a, k) => {
      if (hash(k, 12) > fade) return;
      g.set(a.px, a.py, a.big ? "●" : "•", a.settled ? "0" : "1");
    });
    // 전자 궤도
    for (const k of [0, Math.floor(pos.length / 2), pos.length - 1]) {
      const a = pos[k];
      if (!a?.settled || fade < 0.5) continue;
      const w = t * 4 + k;
      g.set(a.px + Math.cos(w) * 3, a.py + Math.sin(w) * 1.6, "·", "4");
    }

    // 분자식
    if (lt > 5) {
      const f = FORMULAS[Math.floor(t / PER) % FORMULAS.length];
      g.text(Math.floor((COLS - f.length) / 2), ROWS - 6, f, "5");
    }
    return g.frame();
  };
}
