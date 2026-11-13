"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cover } from "@/components/art/Cover";
import { AsciiPiece } from "@/components/ascii/AsciiPiece";
import { ScrambleText } from "@/components/glyph/ScrambleText";
import { openScrapbook } from "@/components/layout/ScrapMenu";
import type { Discipline } from "@/types/database";
import { useT } from "@/lib/i18n/client";
import { LangToggle } from "@/components/layout/LangToggle";

type Item = { slug: string; title: string; discipline: Discipline; author: string };
type Crew = { handle: string; name: string; discipline: Discipline };
type Props = { items: Item[]; crew: Crew[]; tags: string[]; embedded?: boolean }; // embedded: 캔버스 안 (끌기는 캔버스가 담당)

const TAU = Math.PI * 2;
const BASE = 0.14; // rad/s
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 궤도 히어로: 썸네일 공전 + 렌즈 차폐 + 드래그 관성
// 이름 → 이니셜 (Yeji C. → YC · H → H)
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export function OrbitHero({ items, crew, tags, embedded }: Props) {
  const t = useT();
  const stage = useRef<HTMLDivElement>(null);
  const itemEls = useRef<(HTMLAnchorElement | null)[]>([]);
  const crewEls = useRef<(HTMLAnchorElement | null)[]>([]);
  const tagEls = useRef<(HTMLSpanElement | null)[]>([]);
  const ringA = useRef<SVGEllipseElement>(null);
  const ringB = useRef<SVGEllipseElement>(null);
  const ringC = useRef<SVGEllipseElement>(null);
  const lens = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const phys = useRef({ angle: 0, vel: BASE, target: BASE, drag: false, lastX: 0, lastT: 0, moved: 0 });

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let prev = performance.now();
    let visible = true;
    const root = document.documentElement;
    // 히어로 노출 중: 모바일 헤더 숨김 (제목 중복 방지)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (e.intersectionRatio > 0.35) root.dataset.atHero = "1";
      else delete root.dataset.atHero;
    }, { threshold: [0, 0.35, 0.6, 1] });
    io.observe(el);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (!visible) return;
      const p = phys.current;

      // 속도: 관성 → 목표 속도 수렴
      if (!p.drag) {
        p.vel = lerp(p.vel, p.target, 1 - Math.exp(-dt * (p.target === 0 ? 6 : 2.2)));
        if (p.target === 0 && Math.abs(p.vel) < 0.003) p.vel = 0; // 호버 완전 정지
        if (!reduce) p.angle += p.vel * dt;
      }

      const W = el.clientWidth;
      const H = el.clientHeight;
      const rect = el.getBoundingClientRect();
      const sp = clamp(-rect.top / (H * 0.8));
      const cx = W / 2;
      const cy = H * (W < 600 ? 0.47 : 0.4) - sp * 40;
      const Rx = Math.min(W * (W < 600 ? 0.4 : 0.38), 640);
      const tilt = lerp(W < 600 ? 0.62 : 0.36, 0.14, sp);
      const Ry = Rx * tilt;

      if (lens.current) lens.current.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      ringA.current?.setAttribute("rx", String(Rx));
      ringA.current?.setAttribute("ry", String(Ry));
      ringA.current?.setAttribute("cx", String(cx));
      ringA.current?.setAttribute("cy", String(cy));
      ringB.current?.setAttribute("rx", String(Rx * 0.58));
      ringB.current?.setAttribute("ry", String(Ry * 0.58));
      ringB.current?.setAttribute("cx", String(cx));
      ringB.current?.setAttribute("cy", String(cy));
      ringC.current?.setAttribute("rx", String(Rx * 1.32));
      ringC.current?.setAttribute("ry", String(Ry * 1.32));
      ringC.current?.setAttribute("cx", String(cx));
      ringC.current?.setAttribute("cy", String(cy));

      // 링 A: 아티클 썸네일
      const n = itemEls.current.length;
      itemEls.current.forEach((node, i) => {
        if (!node) return;
        const th = p.angle + (i / n) * TAU;
        const depth = Math.sin(th);
        const s = 0.58 + 0.42 * ((depth + 1) / 2);
        const x = cx + Math.cos(th) * Rx;
        const y = cy + depth * Ry;
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)}) rotate(${(Math.cos(th) * -6).toFixed(2)}deg)`;
        node.style.zIndex = String(depth < 0 ? 10 + Math.round((depth + 1) * 20) : 60 + Math.round(depth * 20));
        node.style.setProperty("--depth", depth.toFixed(3));
      });

      // 링 B: 크루 (역방향, 빠르게)
      const m = crewEls.current.length;
      crewEls.current.forEach((node, i) => {
        if (!node) return;
        const th = -p.angle * 1.7 + (i / m) * TAU + 0.4;
        const depth = Math.sin(th);
        const x = cx + Math.cos(th) * Rx * 0.58;
        const y = cy + depth * Ry * 0.58;
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(0.75 + 0.25 * (depth + 1) / 2).toFixed(3)})`;
        node.style.zIndex = String(depth < 0 ? 20 : 70);
      });

      // 링 C: 태그 위성 (느리게)
      const k = tagEls.current.length;
      tagEls.current.forEach((node, i) => {
        if (!node) return;
        const th = p.angle * 0.35 + (i / k) * TAU;
        const depth = Math.sin(th);
        const x = cx + Math.cos(th) * Rx * 1.32;
        const y = cy + depth * Ry * 1.32;
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        node.style.opacity = (0.25 + 0.6 * ((depth + 1) / 2)).toFixed(2);
      });
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); delete root.dataset.atHero; };
  }, []);

  // 드래그 회전
  const down = (e: React.PointerEvent) => {
    const p = phys.current;
    p.drag = true;
    p.lastX = e.clientX;
    p.lastT = performance.now();
    p.moved = 0;
  };
  const move = (e: React.PointerEvent) => {
    const p = phys.current;
    if (!p.drag) return;
    const now = performance.now();
    const dx = e.clientX - p.lastX;
    const da = (dx / (stage.current?.clientWidth ?? 1000)) * 3.2;
    p.angle += da;
    p.vel = da / Math.max((now - p.lastT) / 1000, 0.008);
    p.moved += Math.abs(dx);
    p.lastX = e.clientX;
    p.lastT = now;
    if (p.moved > 6) stage.current?.setPointerCapture(e.pointerId);
  };
  const up = (e: React.PointerEvent) => {
    phys.current.drag = false;
    if (stage.current?.hasPointerCapture(e.pointerId)) stage.current.releasePointerCapture(e.pointerId);
  };
  const guardClick = (e: React.MouseEvent) => { if (phys.current.moved > 6) e.preventDefault(); };
  const hover = (i: number | null) => {
    setActive(i);
    phys.current.target = i === null ? BASE : 0;
  };

  return (
    <section className="orbit" aria-label="Latest articles in orbit">
      <div
        ref={stage}
        className="orbit-stage"
        onPointerDown={embedded ? undefined : down}
        onPointerMove={embedded ? undefined : move}
        onPointerUp={embedded ? undefined : up}
        onPointerCancel={embedded ? undefined : up}
        onClickCapture={embedded ? undefined : guardClick}
      >
        <svg className="orbit-paths" aria-hidden="true">
          <ellipse ref={ringC} className="ring ring-c" />
          <ellipse ref={ringA} className="ring ring-a" />
          <ellipse ref={ringB} className="ring ring-b" />
        </svg>

        {/* 중심: 망원경 렌즈 */}
        <div ref={lens} className="lens" aria-hidden="true">
          <div className="lens-glass">
            <AsciiPiece piece="binary-stars" look="ascii" label="Binary star" />
          </div>
          <svg className="lens-ring" viewBox="0 0 200 200">
            <defs><path id="lens-path" d="M100,100 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0" /></defs>
            <text><textPath href="#lens-path">{t("백조자리 β", "CYGNUS β")} · ALBIREO · {t("천상열차", "STAR CHART")} · RA 19H30M43S · DEC +27°57′35″ · PEER-REVIEWED ·</textPath></text>
          </svg>
        </div>

        <div className="orbit-head">
          <h1 className="orbit-title display" aria-label="Albireo">
            <ScrambleText text="Albi" trigger="mount" duration={1400} /><em className="brand-em"><ScrambleText text="reo" trigger="mount" duration={1800} /></em>
          </h1>
          <p className="orbit-tagline">{t("동료 검수", "Peer-reviewed")} <br />{t("대학생 웹진", "student webzine")}</p>
        </div>
        <p className="orbit-vert" aria-hidden="true">알비레오</p>
        <div className="orbit-lattice" aria-hidden="true" />

        {tags.map((t, i) => (
          <span key={t} ref={(n) => { tagEls.current[i] = n; }} className="orbit-tag label">{t}</span>
        ))}

        {crew.map((c, i) => (
          <Link key={c.handle} href={`/authors/${c.handle}`} ref={(n) => { crewEls.current[i] = n; }} className="orbit-crew" data-d={c.discipline} title={c.name}>
            <span>{initials(c.name)}</span>
          </Link>
        ))}

        {items.map((a, i) => (
          <Link
            key={a.slug}
            href={`/articles/${a.slug}`}
            ref={(n) => { itemEls.current[i] = n; }}
            className="orbit-item"
            data-d={a.discipline}
            data-active={active === i || undefined}
            onPointerEnter={() => hover(i)}
            onPointerLeave={() => hover(null)}
            onFocus={() => hover(i)}
            onBlur={() => hover(null)}
            draggable={false}
          >
            <Cover seed={a.slug} d={a.discipline} className="orbit-cover" label={a.title} />
            <span className="orbit-meta">
              <span className="label">{String(i + 1).padStart(2, "0")} · {a.author}</span>
              <span className="orbit-name">{a.title}</span>
            </span>
          </Link>
        ))}

        {/* 모바일: 궤도 아래 스크랩 메뉴 */}
        <nav className="orbit-menu" aria-label="Menu">
          <Link href="/articles" className="scrap-tab" style={{ ["--r" as string]: "-4deg" }}>{t("웹진", "Webzine")}</Link>
          <Link href="/members" className="scrap-tab" style={{ ["--r" as string]: "3deg" }}>{t("멤버", "Members")}</Link>
          <Link href="/studio" className="scrap-tab scrap-tab-ink" style={{ ["--r" as string]: "-2deg" }}>{t("작업실", "Studio")}</Link>
          <LangToggle />
          <button type="button" className="scrap-open" onClick={openScrapbook}><span>{t("목차", "Index")}</span><i aria-hidden="true">✦</i></button>
        </nav>

        <div className="orbit-cta">
          <Link href="/articles" className="btn btn-gold">Webzine</Link>
          <Link href="/studio" className="btn">Studio</Link>
        </div>
      </div>
    </section>
  );
}
