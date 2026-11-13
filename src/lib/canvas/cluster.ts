import { fnv1a } from "@/lib/text/hash";

// 캔버스 배치: 분야별 섬 + 해바라기 나선 + 충돌 회피
export type Item = { id: string; w: number; h: number };
export type Placed = Item & { x: number; y: number };
export type Group = { id: string; label?: Item; items: Item[] };

const GOLD = Math.PI * (3 - Math.sqrt(5));
const PAD = 26;

export const rand = (seed: string) => {
  let s = parseInt(fnv1a(seed), 36) || 1;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
};

const hit = (a: Placed, b: Placed) =>
  a.x < b.x + b.w + PAD && b.x < a.x + a.w + PAD && a.y < b.y + b.h + PAD && b.y < a.y + a.h + PAD;

// 중심 (cx,cy) 주변 빈 자리
function spot(it: Item, cx: number, cy: number, taken: Placed[], r: () => number, step: number, W: number, H: number): Placed {
  const turn = r() * Math.PI * 2;
  for (let k = 0; k < 900; k++) {
    const rad = step * Math.sqrt(k), a = k * GOLD + turn;
    const x = Math.round(cx + Math.cos(a) * rad * 1.25 - it.w / 2);
    const y = Math.round(cy + Math.sin(a) * rad - it.h / 2);
    // 반복 이음매 여백
    if (x < PAD || y < PAD || x + it.w > W - PAD || y + it.h > H - PAD) continue;
    const p = { ...it, x, y };
    if (!taken.some((q) => hit(p, q))) return p;
  }
  return { ...it, x: Math.round(cx - it.w / 2), y: Math.round(cy - it.h / 2) };
}

// hero: 반복 단위 중앙 고정 · groups: 둘레에 섬으로
export function cluster(hero: Item | null, groups: Group[], opts: { w: number; h: number; seed: string }): Placed[] {
  const { w: W, h: H, seed } = opts;
  const r = rand(seed);
  const out: Placed[] = [];
  const cx = W / 2, cy = H / 2;
  if (hero) out.push({ ...hero, x: Math.round(cx - hero.w / 2), y: Math.round(cy - hero.h / 2) });
  const n = groups.length;
  const off = r() * Math.PI * 2;
  groups.forEach((g, i) => {
    const a = off + (i / Math.max(1, n)) * Math.PI * 2;
    const gx = cx + Math.cos(a) * W * 0.3, gy = cy + Math.sin(a) * H * 0.3;
    if (g.label) out.push(spot(g.label, gx, gy, out, r, 20, W, H));
    for (const it of g.items) out.push(spot(it, gx, gy, out, r, 46, W, H));
  });
  return out;
}
