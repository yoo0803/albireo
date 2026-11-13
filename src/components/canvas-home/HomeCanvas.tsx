"use client";
import { useCallback, type ReactNode } from "react";
import { InfiniteCanvas, type Layout } from "./InfiniteCanvas";
import { InView } from "./InView";
import { cluster, type Group } from "@/lib/canvas/cluster";

type Props = { hero: ReactNode; echo: ReactNode; groups: Group[]; nodes: Record<string, ReactNode>; overlay?: ReactNode };

// 메인: 원래 히어로가 화면 그대로 중앙, 둘레로 확장
export function HomeCanvas({ hero, echo, groups, nodes, overlay }: Props) {
  const build = useCallback((vw: number, vh: number): Layout => {
    const W = Math.max(2600, vw + 1500), H = Math.max(2000, vh + 1200);
    const placed = cluster({ id: "hero", w: vw, h: vh }, groups, { w: W, h: H, seed: "albireo-home" });
    return {
      chunk: { w: W, h: H },
      focus: { x: W / 2, y: H / 2 },
      tiles: placed.map((p) => ({
        ...p,
        node: p.id === "hero" ? <InView fallback={echo}>{hero}</InView> : nodes[p.id],
      })),
    };
  }, [groups, nodes, hero, echo]);
  return <InfiniteCanvas build={build} placeholder={hero} overlay={overlay} className="canvas-home" />;
}
