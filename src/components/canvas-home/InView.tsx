"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// 화면 근처일 때만 마운트 (무거운 타일)
export function InView({ children, fallback, margin = "240px" }: { children: ReactNode; fallback?: ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  // 첫 칠하기 전 판정 (깜박임 방지)
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (r && r.right > -240 && r.bottom > -240 && r.left < innerWidth + 240 && r.top < innerHeight + 240) setOn(true);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return <div ref={ref} className="in-view">{on ? children : fallback}</div>;
}
