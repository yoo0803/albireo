// 코드 블록 확장: ```chart · ```diagram

export type ChartKindX = "bar" | "line" | "area" | "pie" | "scatter";
export type ChartBlock = { kind?: ChartKindX; title?: string; csv: string };

// 머리 옵션 (type: · title:) + CSV
export function parseChartBlock(text: string): ChartBlock {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: ChartBlock = { csv: "" };
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(type|title)\s*:\s*(.+)$/i);
    if (!m) break;
    const v = m[2].trim();
    if (m[1].toLowerCase() === "type" && ["bar", "line", "area", "pie", "scatter"].includes(v)) out.kind = v as ChartKindX;
    if (m[1].toLowerCase() === "title") out.title = v.slice(0, 120);
  }
  out.csv = lines.slice(i).join("\n").trim();
  return out;
}

export type DiagramEdge = { from: string; to: string; label?: string; directed: boolean };
export type Diagram = { dir: "right" | "down"; nodes: string[]; edges: DiagramEdge[]; title?: string };

// "A -> B : 설명" · "A -- B" · "direction: down" · "title: …"
export function parseDiagram(text: string): Diagram {
  const d: Diagram = { dir: "right", nodes: [], edges: [] };
  const add = (n: string) => { const v = n.trim().slice(0, 40); if (v && !d.nodes.includes(v)) d.nodes.push(v); return v; };
  for (const raw of text.split("\n").slice(0, 120)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const opt = line.match(/^(direction|title)\s*:\s*(.+)$/i);
    if (opt) {
      if (opt[1].toLowerCase() === "direction") d.dir = /^(down|td|tb|세로)$/i.test(opt[2].trim()) ? "down" : "right";
      else d.title = opt[2].trim().slice(0, 120);
      continue;
    }
    const m = line.match(/^(.+?)\s*(->|-->|→|--|—)\s*(.+?)(?:\s*:\s*(.+))?$/);
    if (m) {
      const from = add(m[1]);
      const to = add(m[3]);
      if (from && to) d.edges.push({ from, to, label: m[4]?.trim().slice(0, 40), directed: m[2] !== "--" && m[2] !== "—" });
    } else add(line);
  }
  return d;
}

// 단계 배치: 최장 경로 기준 열
export function layoutDiagram(d: Diagram) {
  const depth = new Map<string, number>(d.nodes.map((n) => [n, 0]));
  for (let pass = 0; pass < d.nodes.length; pass++) {
    let changed = false;
    for (const e of d.edges) {
      if (!e.directed) continue;
      const nd = (depth.get(e.from) ?? 0) + 1;
      if (nd > (depth.get(e.to) ?? 0) && nd < d.nodes.length) { depth.set(e.to, nd); changed = true; }
    }
    if (!changed) break;
  }
  const layers: string[][] = [];
  for (const n of d.nodes) (layers[depth.get(n) ?? 0] ??= []).push(n);
  return layers.filter(Boolean);
}
