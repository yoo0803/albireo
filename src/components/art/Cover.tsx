import { useId } from "react";
import { fnv1a } from "@/lib/text/hash";
import { seeded } from "@/components/glyph/glyphs";
// 유화 팔레트: 분야별 5종 + 공용(청·금). 기타 분야는 공용
type Tone = "cs" | "chem" | "klit" | "englit" | "biz" | "albireo";
const PALETTE: Record<Tone, string[]> = {
  cs: ["#2c5aa0", "#5b8fd6", "#a9c8ef", "#e3b95c", "#0d1830"],
  chem: ["#2f5446", "#6f9e8a", "#bfd9cb", "#e4efe8", "#12221c"],
  klit: ["#7a2e22", "#c9674a", "#f2c3a4", "#f6e3d8", "#2a0f0b"],
  englit: ["#6b4a12", "#b07a2a", "#e8c98a", "#f3e6c8", "#24180a"],
  biz: ["#4a2346", "#8e4a7c", "#d7a9cb", "#f1e2ec", "#1d0c1b"],
  albireo: ["#1f3f78", "#c08a1f", "#8fb4e8", "#f1d38b", "#0f1a30"],
};
const MARK: Record<Tone, string> = { cs: "λ", chem: "⌬", klit: "◐", englit: "§", biz: "%", albireo: "β" };
const toneOf = (d: string): Tone => (Object.hasOwn(PALETTE, d) ? (d as Tone) : "albireo");

type Props = { seed: string; d: string; label?: string; className?: string; mark?: boolean; base?: string };

// 결정적 생성 커버 (붓결 변위 + 임파스토)
export function Cover({ seed, d, label, className, mark = true, base }: Props) {
  const id = useId().replace(/:/g, "");
  const r = seeded(parseInt(fnv1a(seed), 36));
  const tone = toneOf(d);
  const pal = PALETTE[tone];
  const blobs = Array.from({ length: 5 }, (_, i) => ({
    cx: 10 + r() * 80,
    cy: 10 + r() * 80,
    rr: 22 + r() * 38,
    c: pal[i % 4],
  }));
  const fx = (0.008 + r() * 0.01).toFixed(4);
  const fy = (0.06 + r() * 0.08).toFixed(4);
  const sd = Math.floor(r() * 999);

  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label ?? "cover"}>
      <defs>
        <filter id={`b${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency={`${fx} ${fy}`} numOctaves="3" seed={sd} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="34" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
        <filter id={`i${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency=".06 .4" numOctaves="2" seed={sd + 3} />
          <feDiffuseLighting lightingColor="#fff6e2" surfaceScale="1.4">
            <feDistantLight azimuth="225" elevation="52" />
          </feDiffuseLighting>
        </filter>
        {blobs.map((b, i) => (
          <radialGradient key={i} id={`g${id}${i}`}>
            <stop offset="0" stopColor={b.c} />
            <stop offset="1" stopColor={b.c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <rect width="100" height="100" fill={base ?? pal[4]} />
      <g filter={`url(#b${id})`}>
        {blobs.map((b, i) => <circle key={i} cx={b.cx} cy={b.cy} r={b.rr} fill={`url(#g${id}${i})`} />)}
      </g>
      <rect width="100" height="100" filter={`url(#i${id})`} opacity=".4" style={{ mixBlendMode: "soft-light" }} />
      {mark && <text x="8" y="92" fontFamily="var(--font-display)" fontSize="26" fill="#fff8ea" opacity=".9">{MARK[tone]}</text>}
    </svg>
  );
}
