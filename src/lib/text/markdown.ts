import { sentenceIdFactory, splitSentences, type Sentence } from "./sentences";
import { WIKILINK_RE } from "./wikilink";

// ─── AST ─────────────────────────────────────────────
export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; v: string }
  | { t: "em"; v: string }
  | { t: "code"; v: string }
  | { t: "link"; v: string; href: string }
  | { t: "wiki"; term: string; label: string }
  | { t: "fnref"; id: string }
  | { t: "u"; v: string }
  | { t: "s"; v: string }
  | { t: "mark"; v: string };

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string; anchor: string }
  | { type: "paragraph"; sentences: Sentence[] }
  | { type: "quote"; sentences: Sentence[] }
  | { type: "indent"; sentences: Sentence[] }
  | { type: "table"; head: string[]; align: ("left" | "center" | "right")[]; rows: string[][] }
  | { type: "list"; ordered: boolean; items: Sentence[][] }
  | { type: "code"; lang: string; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "hr" }
  | { type: "footnote"; id: string; text: string };

// 허용 URL
export function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:|mailto:)/i.test(h) || h.startsWith("/") || h.startsWith("#")) return h;
  return null;
}

function slugifyAnchor(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-").slice(0, 64);
}

// 표 구분선 · 셀
const TABLE_SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

// 각주: 정의 [^id]: 내용 · 참조 [^id]
const FOOTNOTE_DEF_RE = /^\[\^([^\]\s]{1,24})\]:\s*(.+)$/;

// 블록 파싱 (Raw HTML 미지원: XSS 차단)
export function parseMarkdown(md: string): Block[] {
  const nextId = sentenceIdFactory();
  const toSentences = (text: string) => splitSentences(text).map((raw) => ({ id: nextId(raw), raw }));
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lang: fence[1], text: buf.join("\n") });
      continue;
    }

    const h = line.match(/^(#{2,4})\s+(.+)/);
    if (h) {
      const text = h[2].trim();
      blocks.push({ type: "heading", level: h[1].length as 2 | 3 | 4, text, anchor: slugifyAnchor(text) });
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push({ type: "hr" }); i++; continue; }

    const fn = line.match(FOOTNOTE_DEF_RE);
    if (fn) { blocks.push({ type: "footnote", id: fn[1], text: fn[2].trim() }); i++; continue; }

    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
    if (img && safeHref(img[2])) { blocks.push({ type: "image", alt: img[1], src: img[2] }); i++; continue; }

    // 들여쓰기 블록 (>>)
    if (line.startsWith(">>")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">>")) buf.push(lines[i++].replace(/^>>\s?/, ""));
      blocks.push({ type: "indent", sentences: toSentences(buf.join(" ")) });
      continue;
    }

    // 표 (| a | b | + 구분선)
    if (line.trim().startsWith("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "right" : "left") as "left" | "center" | "right");
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      blocks.push({ type: "table", head, align, rows: rows.map((r) => head.map((_, k) => r[k] ?? "")) });
      continue;
    }

    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">") && !lines[i].startsWith(">>")) buf.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ type: "quote", sentences: toSentences(buf.join(" ")) });
      continue;
    }

    const li = /^(\s*)([-*]|\d+\.)\s+/;
    if (li.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: Sentence[][] = [];
      while (i < lines.length && li.test(lines[i])) items.push(toSentences(lines[i++].replace(li, "")));
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,4}\s|```|>|\s*\||\s*([-*]|\d+\.)\s|\[\^[^\]\s]+\]:)/.test(lines[i])) buf.push(lines[i++]);
    blocks.push({ type: "paragraph", sentences: toSentences(buf.join(" ")) });
  }
  return blocks;
}

// 인라인 파싱
const INLINE_RE = new RegExp(
  [
    "`([^`]+)`",
    "\\*\\*([^*]+)\\*\\*",
    "\\*([^*]+)\\*",
    "\\[([^\\]]+)\\]\\(([^)\\s]+)\\)",
    WIKILINK_RE.source,
    "\\[\\^([^\\]\\s]{1,24})\\]",
    "\\+\\+([^+]+)\\+\\+",
    "~~([^~]+)~~",
    "==([^=]+)==",
  ].join("|"),
  "g",
);

export function parseInline(raw: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of raw.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ t: "text", v: raw.slice(last, idx) });
    if (m[1] !== undefined) out.push({ t: "code", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "strong", v: m[2] });
    else if (m[3] !== undefined) out.push({ t: "em", v: m[3] });
    else if (m[4] !== undefined) {
      const href = safeHref(m[5]);
      out.push(href ? { t: "link", v: m[4], href } : { t: "text", v: m[4] });
    } else if (m[6] !== undefined) out.push({ t: "wiki", term: m[6].trim(), label: (m[7] ?? m[6]).trim() });
    else if (m[8] !== undefined) out.push({ t: "fnref", id: m[8] });
    else if (m[9] !== undefined) out.push({ t: "u", v: m[9] });
    else if (m[10] !== undefined) out.push({ t: "s", v: m[10] });
    else if (m[11] !== undefined) out.push({ t: "mark", v: m[11] });
    last = idx + m[0].length;
  }
  if (last < raw.length) out.push({ t: "text", v: raw.slice(last) });
  return out;
}

// 각주 번호: 첫 참조 순서, 미참조 정의는 뒤에
export function footnoteOrder(blocks: Block[]): { id: string; n: number; text: string }[] {
  const defs = new Map<string, string>();
  for (const b of blocks) if (b.type === "footnote" && !defs.has(b.id)) defs.set(b.id, b.text);
  const order: string[] = [];
  const visit = (raw: string) => {
    for (const n of parseInline(raw)) if (n.t === "fnref" && defs.has(n.id) && !order.includes(n.id)) order.push(n.id);
  };
  for (const b of blocks) {
    if (b.type === "paragraph" || b.type === "quote" || b.type === "indent") b.sentences.forEach((s) => visit(s.raw));
    else if (b.type === "table") [...b.head, ...b.rows.flat()].forEach(visit);
    else if (b.type === "list") b.items.flat().forEach((s) => visit(s.raw));
    else if (b.type === "heading") visit(b.text);
  }
  for (const id of defs.keys()) if (!order.includes(id)) order.push(id);
  return order.map((id, i) => ({ id, n: i + 1, text: defs.get(id)! }));
}

// 목차
export function toc(blocks: Block[]) {
  return blocks.flatMap((b) => (b.type === "heading" ? [{ level: b.level, text: b.text, anchor: b.anchor }] : []));
}

// 읽기 시간 (한글 500자/분)
export function readingMinutes(md: string): number {
  return Math.max(1, Math.round(md.replace(/\s/g, "").length / 500));
}
