import { FONT_SIZE, LINE, PAD, linkPath, shapePath, textWidth, wrap, type Board, type Box, type Measure, type Placed, type Pt, type Tone } from "@/lib/board/model";
import { strokePath } from "./ink";

export type Palette = Record<Tone, string> & { fg: string; dim: string; card: string; line: string; bg: string };

// 화면 테마 색 읽기
export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const v = (k: string, f: string) => cs.getPropertyValue(k).trim() || f;
  return {
    ink: v("--fg", "#1c1a16"), gold: v("--gold", "#c08a1f"), blue: v("--blue", "#2c5aa0"), rose: v("--rose", "#b8452c"),
    sage: v("--sage", "#4f7a5c"), plum: v("--accent", "#6d2b5b"), fg: v("--fg", "#1c1a16"), dim: v("--fg-dim", "#5e584b"),
    card: v("--card", "#fffdf8"), line: v("--line-strong", "rgba(28,26,22,.26)"), bg: v("--bg", "#f1efea"),
  };
}

// color-mix → rgb (캔버스 호환)
const cache = new Map<string, string>();
function mix(a: string, b: string, t: number) {
  const css = `color-mix(in srgb, ${a} ${Math.round(t * 100)}%, ${b})`;
  if (cache.has(css)) return cache.get(css)!;
  const el = document.createElement("span");
  el.style.color = css;
  document.body.appendChild(el);
  const out = getComputedStyle(el).color || a;
  el.remove();
  cache.set(css, out);
  return out;
}

// 선택 영역 → PNG (올가미면 그 모양으로 오려 냄)
export async function exportPNG(opts: {
  board: Board; placed: Map<string, Placed>; region: { box: Box; poly?: Pt[] }; measure: Measure; pal: Palette; font: string; scale?: number; background?: boolean;
}): Promise<Blob> {
  const { board, placed, region, measure, pal, font, scale = 2, background = true } = opts;
  await document.fonts?.ready;
  const { box } = region;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(box.w * scale));
  c.height = Math.max(1, Math.ceil(box.h * scale));
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  g.translate(-box.x, -box.y);
  if (region.poly && region.poly.length > 2) {
    g.beginPath();
    region.poly.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.closePath();
    g.clip();
  }
  if (background) { g.fillStyle = pal.card; g.fillRect(box.x, box.y, box.w, box.h); }

  // 연결선
  g.lineWidth = 1.4;
  for (const l of board.links) {
    const a = placed.get(l.from), b = placed.get(l.to);
    if (!a || !b || a.hidden || b.hidden) continue;
    const from = board.items.find((i) => i.id === l.from);
    g.strokeStyle = from ? pal[from.tone] : pal.dim;
    g.globalAlpha = 0.75;
    g.stroke(new Path2D(linkPath(a, b, l.kind)));
    g.globalAlpha = 1;
  }
  // 카드 · 도형
  for (const it of board.items) {
    const p = placed.get(it.id);
    if (!p || p.hidden) continue;
    const tone = pal[it.tone];
    const path = new Path2D(shapePath(it.shape, p));
    if (it.shape !== "text") {
      g.fillStyle = it.shape === "card" || it.shape === "milestone" ? pal.card : mix(tone, pal.card, it.shape === "note" ? 0.2 : 0.14);
      g.fill(path);
      g.strokeStyle = it.shape === "card" || it.shape === "milestone" ? mix(tone, pal.line, 0.45) : tone;
      g.lineWidth = 1.2;
      g.stroke(path);
    }
    if (it.shape === "card" && it.tone !== "ink") { g.fillStyle = tone; g.fillRect(p.x, p.y + 10, 3, Math.min(28, p.h - 20)); }
    const fs = FONT_SIZE(it.shape);
    g.font = `${it.shape === "text" ? 600 : 500} ${fs}px ${font}`;
    g.fillStyle = pal.fg;
    g.textBaseline = "alphabetic";
    const tw = textWidth({ shape: it.shape, w: p.w });
    const lines = wrap(it.text, tw, fs, measure);
    const centered = ["pill", "ellipse", "diamond", "hex"].includes(it.shape);
    g.textAlign = centered ? "center" : "left";
    let ty = it.shape === "milestone" ? p.y + 36 : centered ? p.y + p.h / 2 - ((lines.length - 1) * fs * LINE) / 2 + fs * 0.35 : p.y + PAD + fs;
    const nested = board.items.some((c) => c.parent === it.id) && !it.collapsed;
    if (it.shape === "card" && !nested) ty = p.y + p.h / 2 - ((lines.length - 1) * fs * LINE) / 2 + fs * 0.35;
    if (it.shape === "folder") ty = p.y + 40;
    const tx = centered ? p.x + p.w / 2 : it.shape === "milestone" ? p.x + 30 : p.x + PAD;
    if (it.shape === "milestone") {
      g.fillStyle = tone; g.beginPath(); g.arc(p.x + 15, p.y + p.h / 2, 5, 0, Math.PI * 2); g.fill();
      g.font = `600 10.5px ui-monospace, Menlo, monospace`; g.fillText(it.date ?? "", tx, p.y + 18);
      g.font = `500 ${fs}px ${font}`; g.fillStyle = pal.fg;
    }
    for (const ln of lines) { g.fillText(ln, tx, ty); ty += fs * LINE; }
  }
  // 필기
  for (const s of board.strokes) { g.fillStyle = s.color; g.fill(new Path2D(strokePath(s))); }

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), "image/png"));
}
