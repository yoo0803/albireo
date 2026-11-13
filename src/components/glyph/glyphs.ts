// 사이퍼 글리프 세트
export const ASH = "░▒▓·:;+=*#%&@$/\\|<>{}[]01";
export const pick = (set: string) => set[(Math.random() * set.length) | 0];

// 시드 난수 (mulberry32)
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
