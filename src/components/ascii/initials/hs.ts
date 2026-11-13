// HS · Korean Literature + Business: 붓 획 위로 차트가 차오르고 낙관 · 아래는 고전 제목 글자 막대그래프
import { Grid, palette } from "ascii-magic-art/lib/kit.js";
import { COLS, ROWS, layout, cells, hash, cycle } from "./font";

export const meta = {
  slug: "initials-hs",
  name: "HS · brush & chart",
  cols: COLS,
  rows: ROWS,
  fps: 20,
  // 0 한지 · 1 먹 회색 · 2 자두 · 3 연자두 · 4 낙관 · 5 어두운 선 · 6 상승 녹
  palette: palette(["#efe8d8", "#8d918c", "#9b4f86", "#d7a9cb", "#c8372d", "#3b3f3d", "#8fc79a"]),
};

const PER = 10;
const BARS = "▁▂▃▄▅▆▇█";

export default function create() {
  const g = new Grid(COLS, ROWS);
  const L = layout("HS");
  const pts = cells(L.mask);
  const seen = new Set<string>();
  const path = L.path.map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]).filter(([x, y]) => {
    const k = `${x},${y}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  const h = L.box.y1 - L.box.y0;

  return (t: number) => {
    g.clear();
    const { lt, fade } = cycle(t, PER);

    // 배경 선 차트
    for (let x = 0; x < COLS; x++) {
      const v = Math.sin((x + t * 6) * 0.18) * 2.2 + Math.sin((x + t * 6) * 0.05) * 3;
      g.set(x, Math.round(ROWS * 0.22 - v), "·", "5");
    }
    // 하단 막대그래프는 고전 제목 글자 더미 (overlays/ClassicStack)

    // 1) 붓 획
    const n = path.length;
    const brushed = Math.floor(Math.max(0, Math.min(1, (lt - 0.4) / 2.6)) * n);
    const inked = new Set<string>();
    for (let i = 0; i < brushed; i++) {
      const [x, y] = path[i];
      inked.add(`${x},${y}`);
      inked.add(`${x + 1},${y}`);
    }

    // 2) 차오르는 막대 (아래 → 위)
    const level = L.box.y1 + 1 - Math.max(0, Math.min(1, (lt - 3.2) / 2.4)) * (h + 2);
    for (const [x, y] of pts) {
      if (!inked.has(`${x},${y}`) || hash(x, y, 5) > fade) continue;
      if (y > level) g.set(x, y, "█", "2");
      else if (y > level - 1) g.set(x, y, BARS[Math.floor((1 - (level - y)) * 7)] ?? "▄", "3");
      else g.set(x, y, hash(x, y) > 0.35 ? "▓" : "▒", "1");
    }
    // 붓 끝 번짐
    if (brushed > 0 && brushed < n) {
      const [x, y] = path[brushed - 1];
      for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [1, 1]]) g.set(x + dx, y + dy, "░", "1");
    }

    // 3) 낙관 + 지표
    if (lt > 5.8 && fade > 0.4) {
      const sx = Math.round(L.box.x1) + 1;
      const sy = Math.round(L.box.y1) - 2;
      g.text(sx, sy, "▓▓", "4");
      g.text(sx, sy + 1, "▓▓", "4");
      const pct = (1.5 + hash(Math.floor(t / 1.5), 6) * 4).toFixed(1);
      const label = `HS ▲ ${pct}%`;
      g.text(Math.floor((COLS - label.length) / 2), 4, label, "6");
    }
    return g.frame();
  };
}
