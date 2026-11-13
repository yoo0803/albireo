import Link from "next/link";
import { CoverArt } from "@/components/art/CoverArt";
import { cleanStyle } from "@/lib/text/style";
import { fieldLabel } from "@/content/fields";
import type { ArticleCard } from "@/lib/data/public";
import { isPiece } from "@/components/ascii/pieces";
import { LazyAscii } from "./LazyAscii";

// 캔버스 타일: 커버 · 멤버 · 문구 · 렌즈

export function CoverTile({ a, lang, seed, tilt = 0 }: { a: ArticleCard; lang: "ko" | "en"; seed?: string; tilt?: number }) {
  const title = lang === "en" && a.title_en ? a.title_en : a.title;
  const s = cleanStyle(a.style);
  return (
    <Link href={`/articles/${a.slug}`} className="tile-cover" draggable={false} style={{ ["--tilt" as string]: `${tilt}deg` }}>
      <span className="tile-cover-art">
        {a.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover_url} alt="" draggable={false} loading="lazy" />
        ) : (
          <CoverArt tpl={s.cover?.tpl} tone={s.cover?.tone} field={a.discipline} title={title} kicker={fieldLabel(a.discipline)} seed={s.cover?.tpl ? a.slug : seed ?? a.slug} />
        )}
      </span>
      <span className="tile-cap">
        <span className="tile-title">{title}</span>
        <span className="tile-meta">{a.author.name}{a.peer_reviewed ? " · ◉ PR" : ""}</span>
      </span>
    </Link>
  );
}

export function MemberTile({ handle, name, role, piece }: { handle: string; name: string; role: string; piece: string }) {
  return (
    <Link href={`/authors/${handle}`} className="tile-member" draggable={false}>
      <span className="tile-lens">{isPiece(piece) && <LazyAscii piece={piece} label={`${name} · ${role}`} />}</span>
      <span className="tile-name">{name}</span>
      <span className="tile-meta">{role}</span>
    </Link>
  );
}

export function WordTile({ text, sub, variant = "serif" }: { text: string; sub?: string; variant?: "serif" | "brand" | "label" | "ko" }) {
  return (
    <div className={`tile-word tile-word-${variant}`}>
      <span>{text}</span>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function LensTile({ label }: { label: string }) {
  return (
    <div className="tile-orb" aria-label={label}>
      <LazyAscii piece="binary-stars" label={label} fit={false} />
    </div>
  );
}

// 섬 이름: 이탤릭 세리프
export function IslandLabel({ text }: { text: string }) {
  return <span className="tile-island">{text}</span>;
}

// 연재 실: 회차 표지 꼭대기 매듭을 차례대로 잇는 실 (표지 위로 느슨한 아치 · 두 가닥 · 풀린 끝)
export function ThreadTile({ href, title, pins, w, h }: { href: string; title: string; pins: [number, number][]; w: number; h: number }) {
  const arch = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], lift = 34 + Math.abs(dx) * 0.07;
    return `C ${a[0] + dx * 0.25} ${a[1] - lift} ${b[0] - dx * 0.25} ${b[1] - lift} ${b[0]} ${b[1]}`;
  };
  const [f, l] = [pins[0], pins[pins.length - 1]];
  // 앞: 표지 왼쪽 바깥에서 늘어진 끝 → 회차 사이 아치 → 뒤: 작은 고리 하나와 풀린 끝
  let d = `M ${f[0] - 150} ${f[1] + 60} C ${f[0] - 120} ${f[1] + 10} ${f[0] - 50} ${f[1] - 40} ${f[0]} ${f[1]} `;
  for (let i = 1; i < pins.length; i++) d += arch(pins[i - 1], pins[i]) + " ";
  d += `C ${l[0] + 50} ${l[1] - 40} ${l[0] + 120} ${l[1] - 20} ${l[0] + 128} ${l[1] + 14} C ${l[0] + 134} ${l[1] + 40} ${l[0] + 104} ${l[1] + 44} ${l[0] + 110} ${l[1] + 22} C ${l[0] + 116} ${l[1] + 4} ${l[0] + 150} ${l[1] + 30} ${l[0] + 160} ${l[1] + 70}`;
  return (
    <div className="tile-thread">
      <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <path className="strand-a" d={d} />
        <path className="strand-b" d={d} transform="translate(1.4 1.1)" />
        {pins.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.6} />)}
      </svg>
      <Link href={href} className="tile-thread-label" draggable={false}>{title}</Link>
    </div>
  );
}
