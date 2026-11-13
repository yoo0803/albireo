"use client";
import { useState } from "react";
import { Reactions } from "@/components/reactions/Reactions";

// 메인 화면 반응 체험 (저장 안 됨 · 캔버스와 함께 움직이지 않음)
export function ReactDock() {
  const [liked, setLiked] = useState(false);
  const [n, setN] = useState(42);
  return (
    <div className="react-dock" onPointerDown={(e) => e.stopPropagation()}>
      <Reactions liked={liked} likes={n} onToggle={() => { const v = !liked; setLiked(v); setN((x) => x + (v ? 1 : -1)); return v; }} />
    </div>
  );
}
