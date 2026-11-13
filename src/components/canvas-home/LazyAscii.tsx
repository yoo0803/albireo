"use client";
import { useEffect, useRef, useState } from "react";
import { AsciiPiece } from "@/components/ascii/AsciiPiece";
import type { PieceName } from "@/components/ascii/pieces";

// 화면 안에 있을 때만 재생
export function LazyAscii({ piece, label, fit = true }: { piece: PieceName; label: string; fit?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="lazy-ascii">{on && <AsciiPiece piece={piece} className={fit ? "ascii-fit" : undefined} label={label} />}</div>;
}
