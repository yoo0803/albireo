import { layoutDiagram, parseDiagram } from "@/lib/text/blocks";

// 문자 폭 근사 (한글 · 전각 넓게)
const textW = (s: string) => [...s].reduce((w, c) => w + (/[ᄀ-ᇿ　-鿿가-힯＀-￯]/.test(c) ? 13.5 : 7.4), 0);

// 다이어그램: 단계별 흐름도 SVG
export function DiagramView({ source }: { source: string }) {
  const d = parseDiagram(source);
  if (!d.nodes.length) return null;
  const layers = layoutDiagram(d);
  const NH = 40, GAP = d.dir === "right" ? 84 : 52, LANE = 26, PAD = 16;
  const w = new Map(d.nodes.map((n) => [n, Math.max(64, Math.min(220, textW(n) + 28))]));

  // 좌표
  const pos = new Map<string, { x: number; y: number; w: number }>();
  if (d.dir === "right") {
    let x = PAD;
    const colH = layers.map((l) => l.length * NH + (l.length - 1) * LANE);
    const H = Math.max(...colH);
    layers.forEach((l, li) => {
      const cw = Math.max(...l.map((n) => w.get(n)!));
      l.forEach((n, k) => pos.set(n, { x: x + (cw - w.get(n)!) / 2, y: PAD + (H - colH[li]) / 2 + k * (NH + LANE), w: w.get(n)! }));
      x += cw + GAP;
    });
  } else {
    const rowW = layers.map((l) => l.reduce((s, n) => s + w.get(n)!, 0) + (l.length - 1) * LANE);
    const W = Math.max(...rowW);
    layers.forEach((l, li) => {
      let x = PAD + (W - rowW[li]) / 2;
      l.forEach((n) => { pos.set(n, { x, y: PAD + li * (NH + GAP), w: w.get(n)! }); x += w.get(n)! + LANE; });
    });
  }
  const all = [...pos.values()];
  const W = Math.max(...all.map((p) => p.x + p.w)) + PAD;
  const H = Math.max(...all.map((p) => p.y + NH)) + PAD;

  const anchor = (n: string, side: "out" | "in") => {
    const p = pos.get(n)!;
    if (d.dir === "right") return { x: side === "out" ? p.x + p.w : p.x, y: p.y + NH / 2 };
    return { x: p.x + p.w / 2, y: side === "out" ? p.y + NH : p.y };
  };

  return (
    <svg className="diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={d.title ?? `Diagram: ${d.nodes.join(", ")}`} style={{ maxWidth: W }}>
      <defs>
        <marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {d.edges.map((e, i) => {
        const a = anchor(e.from, "out");
        const b = anchor(e.to, "in");
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const path = d.dir === "right" ? `M${a.x} ${a.y} C${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 2} ${b.y}` : `M${a.x} ${a.y} C${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y - 2}`;
        return (
          <g key={i} className="dg-edge">
            <path d={path} fill="none" markerEnd={e.directed ? "url(#dg-arrow)" : undefined} />
            {e.label && (d.dir === "right"
              ? <text x={a.x + (b.x - a.x) * 0.62} y={b.y > a.y + 4 ? b.y + 16 : b.y - 7} textAnchor="middle">{e.label}</text>
              : <text x={b.x + 8} y={a.y + (b.y - a.y) * 0.6} textAnchor="start">{e.label}</text>)}
          </g>
        );
      })}
      {d.nodes.map((n, i) => {
        const p = pos.get(n)!;
        return (
          <g key={n} className="dg-node" data-k={i % 5}>
            <rect x={p.x} y={p.y} width={p.w} height={NH} rx="3" />
            <text x={p.x + p.w / 2} y={p.y + NH / 2 + 5} textAnchor="middle">{n}</text>
          </g>
        );
      })}
    </svg>
  );
}
