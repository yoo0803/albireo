import { useId } from "react";

// 낙관(인장): 한 글자 · 세로 두 글자 · 짧은 영단어, 인주 질감
export function Seal({ char, lines, pending = false, size = 92 }: { char?: string; lines?: string[]; pending?: boolean; size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`seal ${pending ? "seal-pending" : ""}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id={`s${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.7" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="c" />
          <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="2" result="w" />
          <feDisplacementMap in="c" in2="w" scale="3.5" />
        </filter>
      </defs>
      <g filter={`url(#s${id})`}>
        <rect x="6" y="6" width="88" height="88" rx="8" fill={pending ? "none" : "currentColor"} stroke="currentColor" strokeWidth={pending ? 3 : 0} strokeDasharray={pending ? "6 5" : undefined} />
        <rect x="14" y="14" width="72" height="72" rx="4" fill="none" stroke={pending ? "currentColor" : "var(--on-ink)"} strokeWidth="2" opacity=".7" />
        {lines && lines.length > 1 ? (
          lines.map((l, i) => {
            // 줄 수에 맞춘 세로 배치
            const n = lines.length, fs = n >= 3 ? 23 : l.length > 2 ? 22 : 31;
            const y = n >= 3 ? 39 + i * 22 : i === 0 ? 47 : 78;
            return <text key={i} x="50" y={y} textAnchor="middle" fontSize={fs} fontFamily="var(--font-serif)" fontWeight="800" letterSpacing={l.length > 2 ? 1 : 0} fill={pending ? "currentColor" : "var(--on-ink)"}>{l}</text>;
          })
        ) : (
          <text x="50" y="68" textAnchor="middle" fontSize={(lines?.[0] ?? char ?? "").length > 2 ? 24 : 50} fontFamily="var(--font-serif)" fontWeight="800" fill={pending ? "currentColor" : "var(--on-ink)"}>{lines?.[0] ?? char}</text>
        )}
      </g>
    </svg>
  );
}
