// YC · Advanced Computing: 0/1 비가 이니셜로 컴파일 · 이진 트리가 자라고 진행 막대가 차오름 · 구석의 알비레오 쌍성
import { Grid, palette } from "ascii-magic-art/lib/kit.js";
import { COLS, ROWS, layout, cells, hash, cycle, blank } from "./font";

export const meta = {
  slug: "initials-yc",
  name: "YC · compile",
  cols: COLS,
  rows: ROWS,
  fps: 20,
  // 0 밝은 청 · 1 청 · 2 남 · 3 심야 · 4 금 · 5 크림
  palette: palette(["#cfe0ff", "#7fa6e8", "#3b5a94", "#1e2c4c", "#ffd166", "#fff2c4"]),
};

const PER = 9;
const LOG = "$ make YC";
// 이진 트리 (이니셜 위, 원형 렌즈 안): 너비 우선 순서로 마디가 켜짐
const NODES: [number, number][] = [[30, 1], [25, 3], [35, 3], [22, 5], [27, 5], [33, 5], [38, 5]];
const PARENT = [-1, 0, 0, 1, 1, 2, 2];
const BAR = 16;

export default function create() {
  const g = new Grid(COLS, ROWS);
  const L = layout("YC");
  const pts = cells(L.mask);
  const speed = Array.from({ length: COLS }, (_, x) => 7 + hash(x, 1) * 9);
  const off = Array.from({ length: COLS }, (_, x) => hash(x, 2) * 60);

  return (t: number) => {
    g.clear();
    const { lt, fade } = cycle(t, PER);
    const tick = Math.floor(t * 10);

    // 비트 비
    for (let x = 0; x < COLS; x += 2) {
      const head = ((t * speed[x] + off[x]) % (ROWS + 14)) - 7;
      for (let k = 0; k < 9; k++) {
        const y = Math.floor(head - k);
        if (y < 0 || y >= ROWS) continue;
        const bit = hash(x, y, tick) > 0.5 ? "1" : "0";
        g.set(x, y, bit, k === 0 ? "0" : k < 3 ? "1" : k < 6 ? "2" : "3");
      }
    }

    // 셀 잠금: 위에서 아래로
    const scan = ((lt - 4.2) / 1.4) * (L.box.y1 - L.box.y0 + 4) + L.box.y0 - 2;
    for (const [x, y] of pts) {
      const at = 0.6 + ((y - L.box.y0) / (L.box.y1 - L.box.y0)) * 2.6 + hash(x, y) * 0.7;
      if (lt < at || hash(x, y, 9) > fade) continue;
      const settling = lt - at < 0.35;
      const lit = Math.abs(y - scan) < 1.2;
      g.set(x, y, settling ? (hash(x, y, tick) > 0.5 ? "1" : "0") : "█", lit ? "4" : settling ? "0" : "1");
    }

    // 이진 트리
    blank(g, 19, 0, 23, 7);
    NODES.forEach(([x, y], i) => {
      const at = 0.8 + i * 0.45;
      if (lt < at || fade < 0.25) return;
      const p = PARENT[i];
      if (p >= 0) {
        const [px, py] = NODES[p];
        // 부모 → 자식 가지
        for (let s = 1; s < 3; s++) {
          const ex = Math.round(px + ((x - px) * s) / 3), ey = py + 1;
          if (s === 2) continue;
          g.set(ex, ey, x < px ? "/" : "\\", "2");
        }
      }
      g.set(x, y, lt - at < 0.3 ? "◉" : "●", lt - at < 0.3 ? "5" : "1");
    });

    // 알비레오 쌍성 (C 오른쪽 아래): 금빛 · 푸른 별이 번갈아 반짝
    blank(g, 51, 25, 6, 3);
    const tw = Math.sin(t * 2.2) > 0;
    g.set(52, 27, tw ? "✦" : "✧", "4");
    g.set(54, 26, tw ? "·" : "•", "1");

    // 진행 막대
    const prog = Math.max(0, Math.min(1, (lt - 0.6) / 3.8));
    const n = Math.round(prog * BAR);
    const bar = `[${"█".repeat(n)}${"·".repeat(BAR - n)}] ${String(Math.round(prog * 100)).padStart(3)}%`;
    const bx = Math.floor((COLS - bar.length) / 2);
    blank(g, bx - 1, ROWS - 8, bar.length + 2, 1);
    g.text(bx, ROWS - 8, bar, prog >= 1 ? "4" : "1");

    // 빌드 로그
    const typed = Math.max(0, Math.min(LOG.length, Math.floor((lt - 0.3) * 8)));
    const done = lt > 4.4 ? "  ok" : "";
    const line = LOG.slice(0, typed) + done + (Math.floor(t * 2) % 2 && lt < 4.4 ? "_" : "");
    g.text(Math.floor((COLS - 13) / 2), ROWS - 6, line, done ? "4" : "5");
    return g.frame();
  };
}
