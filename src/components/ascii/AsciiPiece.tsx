"use client";
import { useEffect, useRef } from "react";
import { PIECES, type PieceName } from "./pieces";
import { ClassicStack } from "./overlays/ClassicStack";

// 문자폭 비율 (runtime/canvas.js CELL_W)
const CELL_W = 0.602;

type Props = {
  piece: PieceName;
  look?: "original" | "dots" | "ascii" | "dense" | "binary" | "blocks" | "dither";
  speed?: number;
  className?: string;
  label?: string;
};

// ascii-magic-art 플레이어 래퍼: 컨테이너 폭 맞춤
export function AsciiPiece({ piece, look = "original", speed = 1, className, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const pre = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let ro: ResizeObserver | undefined;
    let cancelled = false;
    const holder = host.current;

    (async () => {
      const [mod, { play }] = await Promise.all([PIECES[piece](), import("ascii-magic-art/runtime/player.js")]);
      if (cancelled || !pre.current || !host.current) return;

      // 폭 → 폰트 크기
      const fit = () => {
        const w = host.current?.clientWidth ?? 0;
        if (pre.current && w) pre.current.style.fontSize = `${w / (mod.meta.cols * CELL_W)}px`;
      };
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(host.current);

      stop = play(pre.current, mod, { speed, look: look === "original" ? undefined : { look } });
    })();

    return () => {
      cancelled = true;
      stop?.();
      ro?.disconnect();
      holder?.querySelectorAll("canvas").forEach((c) => c.remove());
    };
  }, [piece, look, speed]);

  return (
    <div ref={host} className={`ascii ${className ?? ""}`} role="img" aria-label={label ?? `ASCII animation: ${piece}`}>
      <pre ref={pre} aria-hidden="true" />
      {piece === "initials-hs" && <ClassicStack />}
    </div>
  );
}
