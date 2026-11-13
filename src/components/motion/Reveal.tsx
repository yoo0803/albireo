"use client";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";

// 뷰포트 진입 시 data-in
export function Reveal({ as: Tag = "div", children, className, delay = 0 }: { as?: ElementType; children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.in = "1"; io.disconnect(); } }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${className ?? ""}`} style={{ ["--d" as string]: `${delay}ms` }}>{children}</Tag>;
}
