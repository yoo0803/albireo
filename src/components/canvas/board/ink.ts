import { getStroke } from "perfect-freehand";
import { unpack, type Stroke } from "@/lib/board/model";

// 펜 획 → 윤곽 경로 (SVG · Path2D 공용)
export function inkPath(pts: [number, number, number][], size: number, stream: number, last = true): string {
  if (!pts.length) return "";
  const outline = getStroke(pts, { size, thinning: 0.55, smoothing: 0.6, streamline: Math.min(0.95, 0.2 + stream * 0.7), simulatePressure: pts.every((p) => p[2] === 0.5), last });
  if (outline.length < 2) return "";
  const avg = (a: number, b: number) => (a + b) / 2;
  let d = `M${outline[0][0].toFixed(1)} ${outline[0][1].toFixed(1)}Q`;
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d += `${x0.toFixed(1)} ${y0.toFixed(1)} ${avg(x0, x1).toFixed(1)} ${avg(y0, y1).toFixed(1)} `;
  }
  return d + "Z";
}

export const strokePath = (s: Stroke) => inkPath(unpack(s.pts), s.size, s.stream);
