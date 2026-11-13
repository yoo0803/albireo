"use client";
import { useEffect, useRef, useState } from "react";
import { parseMarkdown } from "@/lib/text/markdown";
import { blockHtml, htmlToMd, mdToHtml } from "@/lib/text/richtext";
import { createRoot, type Root } from "react-dom/client";
import { LangProvider, useLang } from "@/lib/i18n/client";
import { RichBlock } from "./RichBlock";
import { proseProps, type ArticleStyle } from "@/lib/text/style";
import { useReferences } from "@/lib/cite/client";
import { useT } from "@/lib/i18n/client";
import { ArticleBody } from "@/components/article/ArticleBody";
import { FontLinks } from "@/components/article/FontLinks";
import { InsertBar, type FormatKind } from "./InsertBar";

type Mode = "visual" | "markdown" | "preview";
type Props = { value: string; onChange: (md: string) => void; style?: ArticleStyle; lang?: "ko" | "en"; label?: string };

const MODE_KEY = "albireo:editor-mode";

// 다음 각주 번호
const nextFootnote = (md: string) => Math.max(0, ...[...md.matchAll(/\[\^(\d+)\]/g)].map((m) => Number(m[1]))) + 1;
const linkText = (s: string) => s.replace(/[[\]]/g, "").trim();
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const MD_WRAP: Partial<Record<FormatKind, string>> = { bold: "**", italic: "*", underline: "++", strike: "~~", mark: "==" };
const MD_PREFIX: Partial<Record<FormatKind, string>> = { h2: "## ", h3: "### ", h4: "#### ", ul: "- ", ol: "1. ", quote: "> ", indent: ">> " };

// 본문 편집: 일반 작성 · 마크다운 · 미리보기
export function BodyEditor({ value, onChange, style = {}, lang = "ko", label }: Props) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("visual");
  const ta = useRef<HTMLTextAreaElement>(null);
  const rich = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const refs = useReferences(mode === "preview" ? value : "");
  const prose = proseProps(style);
  const ui = useLang();
  const roots = useRef(new Map<Element, Root>());

  // 블록 미리보기 마운트
  const hydrate = () => {
    const host = rich.current;
    if (!host) return;
    host.querySelectorAll<HTMLElement>("figure[data-block]").forEach((fig) => {
      if (roots.current.has(fig)) return;
      const root = createRoot(fig);
      roots.current.set(fig, root);
      const render = () =>
        root.render(
          <LangProvider lang={ui}>
            <RichBlock
              lang={fig.dataset.block!}
              src={fig.dataset.src ?? ""}
              onSave={(src) => { fig.dataset.src = src; render(); sync(); }}
              onRemove={() => { roots.current.delete(fig); setTimeout(() => root.unmount()); fig.remove(); sync(); }}
            />
          </LangProvider>,
        );
      render();
    });
  };
  const unmountAll = () => {
    const rs = [...roots.current.values()];
    roots.current.clear();
    setTimeout(() => rs.forEach((r) => r.unmount()));
  };

  useEffect(() => {
    try { const m = localStorage.getItem(MODE_KEY); if (m === "markdown" || m === "visual") setMode(m); } catch {}
  }, []);
  const switchTo = (m: Mode) => {
    setMode(m);
    if (m !== "preview") try { localStorage.setItem(MODE_KEY, m); } catch {}
  };

  // 일반 작성 진입 시 HTML 채움 (입력 중에는 커서 유지)
  useEffect(() => {
    if (mode === "visual" && rich.current) { rich.current.innerHTML = mdToHtml(value); hydrate(); }
    return unmountAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── 마크다운 모드
  const edit = (fn: (s: string, a: number, b: number) => { text: string; caret: number }) => {
    const el = ta.current;
    if (!el) return;
    const { text, caret } = fn(value, el.selectionStart, el.selectionEnd);
    onChange(text);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret); });
  };
  const wrap = (m: string) => edit((s, a, b) => ({ text: s.slice(0, a) + m + s.slice(a, b) + m + s.slice(b), caret: b + m.length * 2 }));
  const prefix = (p: string) =>
    edit((s, a) => {
      const start = s.lastIndexOf("\n", a - 1) + 1;
      const line = s.slice(start);
      const has = line.startsWith(p);
      return { text: s.slice(0, start) + (has ? line.slice(p.length) : p + line), caret: a + (has ? -p.length : p.length) };
    });
  const insertAt = (snippet: string, tail = "") =>
    edit((s, a, b) => ({ text: s.slice(0, a) + snippet + s.slice(b) + tail, caret: a + snippet.length }));
  const insertBlock = (block: string) =>
    edit((s, a) => {
      const pre = s.slice(0, a).replace(/\s*$/, "");
      const post = s.slice(a).replace(/^\s*/, "");
      const text = `${pre}${pre ? "\n\n" : ""}${block}\n\n${post}`;
      return { text, caret: (pre ? pre.length + 2 : 0) + block.length + 2 };
    });

  // ─── 일반 작성 모드
  const sync = () => { if (rich.current) onChange(htmlToMd(rich.current)); };
  const restore = () => {
    rich.current?.focus();
    const sel = getSelection();
    if (range.current && sel) { sel.removeAllRanges(); sel.addRange(range.current); }
  };
  const remember = () => {
    const sel = getSelection();
    if (sel?.rangeCount && rich.current?.contains(sel.anchorNode)) range.current = sel.getRangeAt(0).cloneRange();
  };
  const cmd = (name: string, arg?: string) => { restore(); document.execCommand(name, false, arg); sync(); };
  const currentBlock = () => {
    const n = getSelection()?.anchorNode ?? null;
    const el = n && (n.nodeType === 1 ? (n as Element) : n.parentElement);
    const b = el?.closest("p, div, h2, h3, h4, blockquote, li");
    return b && rich.current?.contains(b) && b !== rich.current ? (b as HTMLElement) : null;
  };

  const format = (k: FormatKind) => {
    if (mode === "markdown") {
      if (MD_WRAP[k]) wrap(MD_WRAP[k]!);
      else if (MD_PREFIX[k]) prefix(MD_PREFIX[k]!);
      else if (k === "hr") insertBlock("---");
      return;
    }
    restore();
    switch (k) {
      case "bold": return cmd("bold");
      case "italic": return cmd("italic");
      case "underline": return cmd("underline");
      case "strike": return cmd("strikeThrough");
      case "mark": {
        const sel = getSelection();
        if (!sel?.rangeCount || sel.isCollapsed) return;
        const r = sel.getRangeAt(0);
        const m = document.createElement("mark");
        try { r.surroundContents(m); } catch { m.appendChild(r.extractContents()); r.insertNode(m); }
        return sync();
      }
      case "ul": return cmd("insertUnorderedList");
      case "ol": return cmd("insertOrderedList");
      case "hr": return cmd("insertHorizontalRule");
      case "indent": {
        const b = currentBlock();
        if (!b) return;
        if (b.tagName !== "P" && b.tagName !== "DIV") return;
        b.classList.toggle("indent");
        return sync();
      }
      default: {
        const tag = k === "quote" ? "BLOCKQUOTE" : k.toUpperCase();
        return cmd("formatBlock", currentBlock()?.tagName === tag ? "P" : tag);
      }
    }
  };

  const link = (text: string, href: string) => {
    if (mode === "markdown") insertAt(`[${linkText(text)}](${href})`);
    else cmd("insertHTML", `<a href="${escHtml(href)}">${escHtml(linkText(text))}</a>&nbsp;`);
  };

  const footnote = (text: string) => {
    const n = nextFootnote(value);
    if (mode === "markdown") insertAt(`[^${n}]`, `\n\n[^${n}]: ${text}`);
    else {
      cmd("insertText", `[^${n}]`);
      const p = document.createElement("p");
      p.textContent = `[^${n}]: ${text}`;
      rich.current?.appendChild(p);
      sync();
    }
  };

  const table = (rows: number, cols: number) => {
    const head = Array.from({ length: cols }, (_, i) => t(`항목 ${i + 1}`, `Column ${i + 1}`));
    if (mode === "markdown") {
      const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
      insertBlock([line(head), `|${" --- |".repeat(cols)}`, ...Array.from({ length: rows }, () => line(Array(cols).fill(" ")))].join("\n"));
    } else {
      const tr = (tag: string, cells: string[]) => `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
      cmd("insertHTML", `<table><thead>${tr("th", head.map(escHtml))}</thead><tbody>${Array.from({ length: rows }, () => tr("td", Array(cols).fill("<br>"))).join("")}</tbody></table><p><br></p>`);
    }
  };

  const block = (lng: "chart" | "diagram", text: string) => {
    const fence = `\`\`\`${lng}\n${text}\n\`\`\``;
    if (mode === "markdown") insertBlock(fence);
    else { cmd("insertHTML", `${blockHtml(lng, text)}<p><br></p>`); hydrate(); sync(); }
  };

  const LABEL: Record<Mode, string> = { visual: t("일반 작성", "Visual"), markdown: "Markdown", preview: t("미리보기", "Preview") };

  return (
    <div className="stack" style={{ ["--gap" as string]: "10px" }}>
      <FontLinks id={style.font} />
      <div className="tabs" role="tablist" aria-label={label}>
        {(["visual", "markdown", "preview"] as Mode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchTo(m)}>{LABEL[m]}</button>
        ))}
      </div>

      {mode !== "preview" && (
        <InsertBar onFormat={format} onLink={link} onFootnote={footnote} onCite={link} onTable={table} onBlock={block} />
      )}

      {mode === "visual" && (
        <div
          ref={rich}
          className="rich prose"
          {...prose}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          lang={lang}
          role="textbox"
          aria-multiline="true"
          aria-label={label ?? "Body"}
          data-placeholder={t("본문", "Body")}
          onInput={sync}
          onKeyUp={remember}
          onMouseUp={remember}
          onBlur={remember}
          onPaste={(e) => {
            // 서식 없는 텍스트만
            e.preventDefault();
            const txt = e.clipboardData.getData("text/plain");
            if (txt.includes("\n\n")) document.execCommand("insertHTML", false, txt.split(/\n{2,}/).map((p) => `<p>${escHtml(p).replace(/\n/g, " ")}</p>`).join(""));
            else document.execCommand("insertText", false, txt);
            sync();
          }}
        />
      )}

      {mode === "markdown" && (
        <textarea
          ref={ta}
          className="textarea code"
          style={{ minHeight: "62vh" }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck
          lang={lang}
          aria-label={label ?? "Body (markdown)"}
          placeholder={t("## 소제목", "## Heading")}
        />
      )}

      {mode === "preview" && (
        <div className="paper" style={{ padding: 32 }}>
          <div className="prose" {...prose}><ArticleBody blocks={parseMarkdown(value)} references={refs} /></div>
        </div>
      )}
    </div>
  );
}
