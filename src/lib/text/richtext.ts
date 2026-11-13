import { parseInline, parseMarkdown, safeHref, type Inline } from "./markdown";

// 일반 작성 모드 변환: 마크다운 ↔ 편집용 HTML (지원 서식만)

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineHtml(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "strong": return `<b>${esc(n.v)}</b>`;
        case "em": return `<i>${esc(n.v)}</i>`;
        case "code": return `<code>${esc(n.v)}</code>`;
        case "u": return `<u>${esc(n.v)}</u>`;
        case "s": return `<s>${esc(n.v)}</s>`;
        case "mark": return `<mark>${esc(n.v)}</mark>`;
        case "link": return `<a href="${esc(n.href)}">${esc(n.v)}</a>`;
        // 개념어 · 각주 참조는 원문 유지
        case "wiki": return esc(n.term === n.label ? `[[${n.term}]]` : `[[${n.term}|${n.label}]]`);
        case "fnref": return esc(`[^${n.id}]`);
        default: return esc(n.v);
      }
    })
    .join("");
}

export const blockHtml = (lang: string, src: string) =>
  `<figure class="rich-block" contenteditable="false" data-block="${esc(lang)}" data-src="${esc(src)}"></figure>`;

export function mdToHtml(md: string): string {
  const out: string[] = [];
  for (const b of parseMarkdown(md)) {
    const inl = (raw: string) => inlineHtml(parseInline(raw));
    switch (b.type) {
      case "heading": out.push(`<h${b.level}>${inl(b.text)}</h${b.level}>`); break;
      case "paragraph": out.push(`<p>${inl(b.sentences.map((s) => s.raw).join(" "))}</p>`); break;
      case "quote": out.push(`<blockquote>${inl(b.sentences.map((s) => s.raw).join(" "))}</blockquote>`); break;
      case "indent": out.push(`<p class="indent">${inl(b.sentences.map((s) => s.raw).join(" "))}</p>`); break;
      case "table":
        out.push(`<table><thead><tr>${b.head.map((h, k) => `<th data-align="${b.align[k]}">${inl(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inl(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
        break;
      case "list": {
        const L = b.ordered ? "ol" : "ul";
        out.push(`<${L}>${b.items.map((it) => `<li>${inl(it.map((s) => s.raw).join(" "))}</li>`).join("")}</${L}>`);
        break;
      }
      case "code":
        // 차트 · 다이어그램: 편집기에서 미리보기 블록
        if (b.lang === "chart" || b.lang === "diagram") out.push(blockHtml(b.lang, b.text));
        else out.push(`<pre data-lang="${esc(b.lang)}">${esc(b.text)}</pre>`);
        break;
      case "image": out.push(`<p>${esc(`![${b.alt}](${b.src})`)}</p>`); break;
      case "hr": out.push("<hr>"); break;
      case "footnote": out.push(`<p>${esc(`[^${b.id}]: `)}${inl(b.text)}</p>`); break;
    }
  }
  return out.join("") || "<p><br></p>";
}

// 편집 DOM → 마크다운 (브라우저 전용)
export function htmlToMd(root: HTMLElement): string {
  const inline = (n: Node): string => {
    if (n.nodeType === 3) return (n.textContent ?? "").replace(/\s*\n\s*/g, " ");
    if (n.nodeType !== 1) return "";
    const el = n as HTMLElement;
    const kids = () => [...el.childNodes].map(inline).join("");
    switch (el.tagName) {
      case "B": case "STRONG": { const t = kids().trim(); return t ? `**${t}**` : ""; }
      case "I": case "EM": { const t = kids().trim(); return t ? `*${t}*` : ""; }
      case "U": { const t = kids().trim(); return t ? `++${t}++` : ""; }
      case "S": case "DEL": case "STRIKE": { const t = kids().trim(); return t ? `~~${t}~~` : ""; }
      case "MARK": { const t = kids().trim(); return t ? `==${t}==` : ""; }
      case "CODE": return `\`${el.textContent ?? ""}\``;
      case "A": {
        const href = safeHref(el.getAttribute("href") ?? "");
        const t = kids();
        return href ? `[${t}](${href})` : t;
      }
      case "BR": return " ";
      case "IMG": return "";
      default: return kids();
    }
  };

  const blocks: string[] = [];
  const block = (el: Element) => {
    const text = () => inline(el).trim();
    switch (el.tagName) {
      case "H1": case "H2": blocks.push(`## ${text()}`); break;
      case "H3": blocks.push(`### ${text()}`); break;
      case "H4": case "H5": case "H6": blocks.push(`#### ${text()}`); break;
      case "BLOCKQUOTE": blocks.push(`> ${text()}`); break;
      case "P": if (el.classList.contains("indent")) { if (text()) blocks.push(`>> ${text()}`); } else if (text()) blocks.push(text()); break;
      case "TABLE": {
        const rows = [...el.querySelectorAll("tr")].map((tr) => [...tr.children].map((c) => inline(c).trim().replace(/\|/g, "/")));
        if (!rows.length) break;
        const n = Math.max(...rows.map((r) => r.length));
        const fill = (r: string[]) => `| ${Array.from({ length: n }, (_, k) => r[k] ?? "").join(" | ")} |`;
        const al = [...(el.querySelector("tr")?.children ?? [])].map((c) => c.getAttribute("data-align"));
        const sep = Array.from({ length: n }, (_, k) => (al[k] === "center" ? ":---:" : al[k] === "right" ? "---:" : "---"));
        blocks.push([fill(rows[0]), `| ${sep.join(" | ")} |`, ...rows.slice(1).map(fill)].join("\n"));
        break;
      }
      case "UL": case "OL": {
        const items = [...el.children].filter((c) => c.tagName === "LI").map((li, k) => `${el.tagName === "OL" ? `${k + 1}.` : "-"} ${inline(li).trim()}`);
        if (items.length) blocks.push(items.join("\n"));
        break;
      }
      case "FIGURE":
        if (el.getAttribute("data-block")) { blocks.push(`\`\`\`${el.getAttribute("data-block")}\n${el.getAttribute("data-src") ?? ""}\n\`\`\``); break; }
        if (text()) blocks.push(text());
        break;
      case "PRE": blocks.push(`\`\`\`${el.getAttribute("data-lang") ?? ""}\n${el.textContent ?? ""}\n\`\`\``); break;
      case "HR": blocks.push("---"); break;
      case "DIV": case "SECTION": case "ARTICLE":
        if (el.classList.contains("indent") && text()) { blocks.push(`>> ${text()}`); break; }
        // 중첩 블록 보존
        if ([...el.children].some((c) => /^(P|DIV|H\d|UL|OL|PRE|BLOCKQUOTE|HR)$/.test(c.tagName))) { [...el.children].forEach(block); break; }
        if (text()) blocks.push(text());
        break;
      default: if (text()) blocks.push(text());
    }
  };

  // 최상위 텍스트 노드 묶음
  let loose = "";
  for (const n of [...root.childNodes]) {
    if (n.nodeType === 1 && !/^(B|STRONG|I|EM|U|S|DEL|STRIKE|MARK|A|CODE|SPAN|BR)$/.test((n as Element).tagName)) {
      if (loose.trim()) blocks.push(loose.trim());
      loose = "";
      block(n as Element);
    } else loose += inline(n);
  }
  if (loose.trim()) blocks.push(loose.trim());
  return blocks.join("\n\n");
}
