import { useId } from "react";
import { fnv1a } from "@/lib/text/hash";
import { seeded } from "@/components/glyph/glyphs";
import { Cover } from "./Cover";

// 썸네일 템플릿: 배경 SVG + 제목 타이포
export const COVER_TEMPLATES = [
  { id: "mono", ko: "모노", en: "Mono" },
  { id: "veil", ko: "베일", en: "Veil" },
  { id: "oil", ko: "유화", en: "Oil" },
  { id: "orbit", ko: "궤도", en: "Orbit" },
  { id: "lattice", ko: "문살", en: "Lattice" },
  { id: "ink", ko: "먹 번짐", en: "Ink wash" },
  { id: "press", ko: "활판", en: "Letterpress" },
  { id: "chart", ko: "천문도", en: "Star chart" },
] as const;
export type CoverTpl = (typeof COVER_TEMPLATES)[number]["id"];

export const COVER_TONES = ["cs", "englit", "klit", "biz", "chem", "albireo"] as const;

// 톤별 색: 짙은 바탕 · 주색 · 옅은 보조 · 포인트 · 종이
const TONE: Record<string, [string, string, string, string, string]> = {
  cs: ["#0e1a31", "#2c5aa0", "#9dbbe6", "#d9b25e", "#f3f0e7"],
  englit: ["#231a0e", "#9b7135", "#dcc39a", "#7a2e22", "#f6f0e2"],
  klit: ["#24100c", "#b25a41", "#e8bfa8", "#2c5aa0", "#f7eee8"],
  biz: ["#1b0d1a", "#6d2b5b", "#cfa7c4", "#c08a1f", "#f5eef2"],
  chem: ["#0e1f1a", "#3f7d68", "#b7d3c6", "#b25a41", "#eef4f0"],
  albireo: ["#0e1830", "#1f3f78", "#9dbbe6", "#c08a1f", "#f4efe4"],
};
// 구 템플릿 id 호환
const LEGACY: Record<string, string> = { grain: "veil" };
const toneOf = (t?: string) => (t && TONE[t] ? t : "albireo");
const AUTO = ["mono", "veil", "orbit", "oil", "press", "chart", "lattice", "ink"];

type Props = {
  tpl?: string;
  tone?: string; // 미지정 = 분야 색
  field?: string;
  title: string;
  kicker?: string; // 분야
  seed: string;
  className?: string;
  showTitle?: boolean;
};

export function CoverArt({ tpl: raw, tone, field, title, kicker, seed, className, showTitle = true }: Props) {
  // 미지정: 시드로 템플릿 고정 선택
  const auto = AUTO[parseInt(fnv1a(`tpl-${seed}`), 36) % AUTO.length];
  const tpl = raw ? LEGACY[raw] ?? raw : auto;
  const id = useId().replace(/:/g, "");
  const tn = toneOf(tone ?? field);
  const [dark, main, soft, point, paper] = TONE[tn];
  const r = seeded(parseInt(fnv1a(seed), 36));
  const first = [...title.trim()][0] ?? "A";
  const no = String((parseInt(fnv1a(seed), 36) % 90) + 10);

  let art: React.ReactNode;
  switch (tpl) {
    case "veil": {
      art = (
        <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id={`v${id}`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor={soft} />
              <stop offset="0.55" stopColor={main} />
              <stop offset="1" stopColor={dark} />
            </linearGradient>
            <radialGradient id={`l${id}`} cx={0.25 + r() * 0.5} cy="0.18" r="0.6">
              <stop offset="0" stopColor={paper} stopOpacity="0.55" />
              <stop offset="1" stopColor={paper} stopOpacity="0" />
            </radialGradient>
            <filter id={`n${id}`}>
              <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" />
            </filter>
          </defs>
          <rect width="100" height="125" fill={`url(#v${id})`} />
          <rect width="100" height="125" fill={`url(#l${id})`} />
          <rect width="100" height="125" filter={`url(#n${id})`} />
        </svg>
      );
      break;
    }
    case "orbit": {
      art = (
        <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100" height="125" fill={dark} />
          {Array.from({ length: 4 }, (_, i) => (
            <ellipse key={i} cx="50" cy="50" rx={16 + i * 10} ry={(16 + i * 10) * 0.4} fill="none" stroke={soft} strokeOpacity={0.42 - i * 0.08} strokeWidth="0.25" transform={`rotate(${-16 + r() * 6} 50 50)`} />
          ))}
          <circle cx="45" cy="50" r="4.6" fill={point} />
          <circle cx="56.5" cy="47.5" r="3" fill={soft} />
          {Array.from({ length: 28 }, (_, i) => <circle key={i} cx={r() * 100} cy={r() * 125} r={r() * 0.35 + 0.1} fill={paper} opacity={r() * 0.5 + 0.2} />)}
        </svg>
      );
      break;
    }
    case "lattice": {
      const step = 12.5;
      art = (
        <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100" height="125" fill={paper} />
          <g stroke={dark} strokeOpacity="0.55" strokeWidth="0.6">
            {Array.from({ length: 6 }, (_, i) => <line key={`v${i}`} x1={8 + i * step} y1="8" x2={8 + i * step} y2="117" />)}
            {Array.from({ length: 10 }, (_, i) => <line key={`h${i}`} x1="8" y1={8 + i * step} x2="70.5" y2={8 + i * step} />)}
          </g>
          {Array.from({ length: 3 }, (_, i) => <rect key={`d${i}`} x={8 + Math.floor(r() * 5) * step + 1} y={8 + Math.floor(r() * 8) * step + 1} width={step - 2} height={step - 2} fill={main} opacity="0.28" />)}
          <rect x="8" y="8" width="62.5" height="109" fill="none" stroke={dark} strokeWidth="1.2" />
        </svg>
      );
      break;
    }
    case "ink": {
      art = (
        <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <filter id={`k${id}`} x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed={Math.floor(r() * 99)} />
              <feDisplacementMap in="SourceGraphic" scale="22" />
              <feGaussianBlur stdDeviation="1.4" />
            </filter>
          </defs>
          <rect width="100" height="125" fill={paper} />
          <g filter={`url(#k${id})`}>
            <circle cx={44 + r() * 18} cy={84 + r() * 8} r="22" fill={dark} opacity="0.88" />
            <circle cx={66 + r() * 8} cy={98} r="10" fill={main} opacity="0.5" />
          </g>
          <rect x="10" y="108" width="6.5" height="6.5" fill="#a5281f" opacity="0.85" />
        </svg>
      );
      break;
    }
    case "press": {
      art = (
        <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100" height="125" fill={paper} />
          <text x="52" y="92" textAnchor="middle" fontSize="104" fontFamily="var(--f-bodoni), var(--font-serif)" fontStyle="italic" fill={main} opacity="0.92">{first}</text>
        </svg>
      );
      break;
    }
    case "chart": {
      art = (
        <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100" height="125" fill={dark} />
          <circle cx="50" cy="70" r="40" fill="none" stroke={soft} strokeOpacity="0.4" strokeWidth="0.3" />
          <circle cx="50" cy="70" r="27" fill="none" stroke={soft} strokeOpacity="0.25" strokeWidth="0.25" strokeDasharray="0.8 1.4" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1="50" y1="70" x2={50 + Math.cos(a) * 40} y2={70 + Math.sin(a) * 40} stroke={soft} strokeOpacity="0.14" strokeWidth="0.25" />;
          })}
          {(() => {
            const pts = Array.from({ length: 6 }, () => [50 + (r() - 0.5) * 52, 70 + (r() - 0.5) * 52]);
            return (
              <>
                <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={point} strokeWidth="0.35" opacity="0.85" />
                {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.3 : 0.8} fill={paper} />)}
              </>
            );
          })()}
          {Array.from({ length: 40 }, (_, i) => <circle key={`s${i}`} cx={r() * 100} cy={r() * 125} r={r() * 0.3 + 0.08} fill={paper} opacity={r() * 0.45 + 0.15} />)}
        </svg>
      );
      break;
    }
    case "oil":
      art = <Cover seed={seed} d={tn} mark={false} />;
      break;
    default: {
      // mono: 종이 + 얇은 테 + 이중성 점
      art = (
        <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="100" height="125" fill={paper} />
          <rect x="6" y="6" width="88" height="113" fill="none" stroke={main} strokeWidth="0.35" />
          <circle cx="83.5" cy="17" r="2.2" fill={point} />
          <circle cx="88" cy="16" r="1.4" fill={main} />
          <line x1="6" y1="88" x2="94" y2="88" stroke={main} strokeWidth="0.25" opacity="0.6" />
        </svg>
      );
    }
  }

  return (
    <div
      className={`cover-art ${className ?? ""}`}
      data-tpl={tpl}
      style={{ ["--cv-dark" as string]: dark, ["--cv-main" as string]: main, ["--cv-soft" as string]: soft, ["--cv-point" as string]: point, ["--cv-paper" as string]: paper }}
    >
      {art}
      {showTitle && (
        <div className="cover-text">
          <span className="cover-top"><span>Albireo</span><span>№ {no}</span></span>
          <span className="cover-title">{title}</span>
          {kicker && <span className="cover-kicker">{kicker}</span>}
        </div>
      )}
    </div>
  );
}
