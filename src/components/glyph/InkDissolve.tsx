"use client";
import { useEffect, useMemo, useRef } from "react";
import { ASH, seeded } from "./glyphs";

type Face = { label: string; title: string; body: string; meta?: string };
type Props = { from: Face; to: Face };

type CharSpec = { ch: string; t: number; dx: number; dy: number; g: string[] };

// 문자열 → 단어 단위 묶음 (줄바꿈 보존)
function toWords(text: string, rnd: () => number): CharSpec[][] {
  return text.split(/(\s+)/).filter(Boolean).map((w) =>
    [...w].map((ch) => ({
      ch,
      t: rnd(),
      dx: (rnd() - 0.3) * 140,
      dy: (rnd() - 0.6) * 90,
      g: Array.from({ length: 6 }, () => ASH[(rnd() * ASH.length) | 0]),
    })),
  );
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// 스크롤 구동: 프라이빗 원고 → 재 → 퍼블릭 웹진
export function InkDissolve({ from, to }: Props) {
  const section = useRef<HTMLElement>(null);
  const axis = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const leftRefs = useRef<HTMLSpanElement[]>([]);
  const rightRefs = useRef<HTMLSpanElement[]>([]);

  const model = useMemo(() => {
    const r = seeded(7);
    return {
      left: { title: toWords(from.title, r), body: toWords(from.body, r) },
      right: { title: toWords(to.title, r), body: toWords(to.body, r) },
    };
  }, [from, to]);

  const flat = useMemo(
    () => ({
      left: [...model.left.title, ...model.left.body].flat(),
      right: [...model.right.title, ...model.right.body].flat(),
    }),
    [model],
  );

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const last = { L: [] as string[], R: [] as string[] };

    const paint = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const span = rect.height - innerHeight;
      const p = reduce ? 1 : clamp(-rect.top / Math.max(span, 1));
      axis.current?.style.setProperty("--p", p.toFixed(3));
      if (counter.current) counter.current.textContent = String(Math.round(p * 100)).padStart(3, "0");

      // 좌: 붕괴
      flat.left.forEach((c, i) => {
        const node = leftRefs.current[i];
        if (!node) return;
        const q = reduce ? 0 : clamp((p - (0.02 + c.t * 0.4)) / 0.16);
        const glyph = q === 0 || c.ch.trim() === "" ? c.ch : c.g[Math.min(5, (q * 6) | 0)];
        if (last.L[i] !== glyph) { node.textContent = glyph; last.L[i] = glyph; }
        node.style.opacity = String(1 - q);
        node.style.transform = q ? `translate3d(${c.dx * q}px, ${c.dy * q - 24 * q}px, 0) rotate(${(c.dx / 6) * q}deg)` : "";
        node.classList.toggle("glyph-ash", q > 0 && q < 1);
      });

      // 우: 재조립
      flat.right.forEach((c, i) => {
        const node = rightRefs.current[i];
        if (!node) return;
        const q = reduce ? 1 : clamp((p - (0.3 + c.t * 0.45)) / 0.16);
        const glyph = q === 1 || c.ch.trim() === "" ? c.ch : c.g[Math.min(5, ((1 - q) * 6) | 0)];
        if (last.R[i] !== glyph) { node.textContent = glyph; last.R[i] = glyph; }
        node.style.opacity = String(q);
        node.style.transform = q < 1 ? `translate3d(${-c.dx * (1 - q)}px, ${-c.dy * (1 - q)}px, 0)` : "";
        node.classList.toggle("glyph-ash", q > 0 && q < 1);
      });
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [flat]);

  let li = 0;
  let ri = 0;
  const renderWords = (words: CharSpec[][], side: "L" | "R") =>
    words.map((w, wi) => (
      <span key={wi} style={{ whiteSpace: w[0]?.ch.trim() ? "nowrap" : "pre-wrap" }}>
        {w.map((c, ci) => {
          const idx = side === "L" ? li++ : ri++;
          return (
            <span
              key={ci}
              className="glyph-char"
              ref={(n) => { if (n) (side === "L" ? leftRefs : rightRefs).current[idx] = n; }}
            >
              {c.ch}
            </span>
          );
        })}
      </span>
    ));

  return (
    <section ref={section} className="dissolve" aria-label="Private draft to public article">
      <div className="dissolve-stage wrap">
        <div className="dissolve-grid">
          <article className="dissolve-panel" aria-hidden="true">
            <div className="mono dim">{from.label}</div>
            <h3 className="serif" style={{ fontSize: "1.5rem", lineHeight: 1.3 }}>{renderWords(model.left.title, "L")}</h3>
            <p className="body">{renderWords(model.left.body, "L")}</p>
            {from.meta && <div className="mono faint">{from.meta}</div>}
          </article>

          <div className="dissolve-axis" ref={axis}>
            <span className="mono dim">is_public</span>
            <div className="bar"><i /></div>
            <span className="mono"><span ref={counter}>000</span>%</span>
          </div>

          <article className="dissolve-panel public" aria-hidden="true">
            <div className="mono" style={{ color: "var(--paper-dim)" }}>{to.label}</div>
            <h3 className="serif" style={{ fontSize: "1.5rem", lineHeight: 1.3 }}>{renderWords(model.right.title, "R")}</h3>
            <p className="body">{renderWords(model.right.body, "R")}</p>
            {to.meta && <div className="mono" style={{ color: "var(--paper-dim)" }}>{to.meta}</div>}
          </article>
        </div>
        <p className="sr-only">{to.title}. {to.body}</p>
      </div>
    </section>
  );
}
