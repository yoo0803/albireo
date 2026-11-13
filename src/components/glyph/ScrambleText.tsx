"use client";
import { useEffect, useRef, useState, type ElementType } from "react";
import { ASH, pick } from "./glyphs";

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  duration?: number; // ms
  trigger?: "view" | "hover" | "mount";
  glyphs?: string;
};

// 스크램블 → 복호화 텍스트
export function ScrambleText({ text, as: Tag = "span", className, duration = 1100, trigger = "view", glyphs = ASH }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [out, setOut] = useState(text);
  const raf = useRef(0);

  const run = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setOut(text);
    cancelAnimationFrame(raf.current);
    const chars = [...text];
    const start = performance.now();
    // 글자별 확정 시점: 좌→우 + 지터
    const lock = chars.map((_, i) => (i / chars.length) * 0.75 + Math.random() * 0.25);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setOut(chars.map((c, i) => (c === " " || p >= lock[i] ? c : pick(glyphs))).join(""));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (trigger === "mount") run();
    if (trigger === "view") {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(el);
      return () => { io.disconnect(); cancelAnimationFrame(raf.current); };
    }
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, trigger]);

  return (
    <Tag ref={ref} className={className} aria-label={text} onMouseEnter={trigger === "hover" ? run : undefined}>
      <span aria-hidden="true">{out}</span>
    </Tag>
  );
}
