// 이니셜 조각 공통: 획 폰트 · 배치 · 마스크

type Pt = [number, number];

function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

// 4×6 박스 (y 아래 방향)
const STROKES: Record<string, Pt[][]> = {
  C: [arc(2.2, 3, 2.2, 3, -40, -320, 22)],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  S: [[...arc(2, 1.5, 2, 1.5, -15, -270, 12), ...arc(2, 4.5, 2, 1.5, -90, 165, 12)]],
  Y: [[[0, 0], [2, 3]], [[4, 0], [2, 3], [2, 6]]],
};

export const COLS = 60;
export const ROWS = 36;

export type Layout = {
  strokes: Pt[][]; // 격자 좌표
  path: Pt[]; // 획 순서 샘플 (펜 경로)
  mask: Set<string>;
  box: { x0: number; y0: number; x1: number; y1: number };
};

// 단어 → 중앙 배치
export function layout(word: string, sx = 3.9, sy = 2.9, gap = 6): Layout {
  const w = word.length * 4 * sx + (word.length - 1) * gap;
  const ox = (COLS - w) / 2;
  const oy = (ROWS - 6 * sy) / 2 - 1;
  const strokes: Pt[][] = [];
  [...word].forEach((c, k) => {
    for (const s of STROKES[c] ?? []) strokes.push(s.map(([x, y]) => [ox + k * (4 * sx + gap) + x * sx, oy + y * sy]));
  });

  const path: Pt[] = [];
  const mask = new Set<string>();
  for (const s of strokes) {
    for (let i = 1; i < s.length; i++) {
      const [ax, ay] = s[i - 1];
      const [bx, by] = s[i];
      const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, (by - ay) * 1.66) * 2));
      for (let j = 0; j < n; j++) {
        const x = ax + ((bx - ax) * j) / n;
        const y = ay + ((by - ay) * j) / n;
        path.push([x, y]);
        // 가로 2칸 두께 (세로로 긴 셀 보정)
        mask.add(`${Math.round(x)},${Math.round(y)}`);
        mask.add(`${Math.round(x) + 1},${Math.round(y)}`);
      }
    }
  }
  return { strokes, path, mask, box: { x0: ox, y0: oy, x1: ox + w, y1: oy + 6 * sy } };
}

export const cells = (m: Set<string>) => [...m].map((k) => k.split(",").map(Number) as Pt);

// 결정적 해시 [0,1)
export const hash = (x: number, y: number, s = 0) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ease = (v: number) => v * v * (3 - 2 * v);

// 주기 내 시간 · 페이드
export function cycle(t: number, per: number) {
  const lt = ((t % per) + per) % per;
  const fade = lt > per - 1.2 ? (per - lt) / 1.2 : 1;
  return { lt, fade };
}

// 사각 영역 비우기 (배경 비 · 괘선 위 작은 창)
export function blank(g: { set: (x: number, y: number, ch: string, co?: string) => void }, x: number, y: number, w: number, h: number) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.set(x + i, y + j, " ");
}
