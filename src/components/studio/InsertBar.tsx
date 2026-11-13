"use client";
import { useState } from "react";
import { fetchReference } from "@/lib/cite/client";
import { normalizeDoi } from "@/lib/cite/apa";
import { useLang, useT } from "@/lib/i18n/client";
import { CsvChart } from "@/components/canvas/CsvChartLazy";
import { DiagramView } from "@/components/article/DiagramView";
import type { ChartKindX } from "@/lib/text/blocks";

export type FormatKind = "bold" | "italic" | "underline" | "strike" | "mark" | "h2" | "h3" | "h4" | "ul" | "ol" | "quote" | "indent" | "hr";

type Props = {
  onFormat?: (k: FormatKind) => void;
  onLink?: (text: string, href: string) => void;
  onFootnote?: (text: string) => void;
  onCite: (title: string, url: string) => void;
  onTable?: (rows: number, cols: number) => void;
  onBlock?: (lang: "chart" | "diagram", text: string) => void;
  compact?: boolean;
};

type Ask = null | "link" | "footnote" | "doi" | "table" | "chart" | "diagram";

const GROUPS: { k: FormatKind; label: string; ko: string; en: string; cls?: string }[][] = [
  [
    { k: "bold", label: "B", ko: "굵게", en: "Bold", cls: "b" },
    { k: "italic", label: "I", ko: "기울임", en: "Italic", cls: "i" },
    { k: "underline", label: "U", ko: "밑줄", en: "Underline", cls: "u" },
    { k: "strike", label: "S", ko: "취소선", en: "Strikethrough", cls: "s" },
    { k: "mark", label: "▮", ko: "형광펜", en: "Highlight", cls: "m" },
  ],
  [
    { k: "h2", label: "H1", ko: "큰 소제목", en: "Heading 1" },
    { k: "h3", label: "H2", ko: "중간 소제목", en: "Heading 2" },
    { k: "h4", label: "H3", ko: "작은 소제목", en: "Heading 3" },
  ],
  [
    { k: "ul", label: "•", ko: "글머리 목록", en: "Bulleted list" },
    { k: "ol", label: "1.", ko: "번호 목록", en: "Numbered list" },
    { k: "quote", label: "❝", ko: "인용", en: "Quote" },
    { k: "indent", label: "⇥", ko: "들여쓰기", en: "Indent" },
    { k: "hr", label: "—", ko: "가로줄", en: "Divider" },
  ],
];

const CHART_KINDS: ChartKindX[] = ["bar", "line", "area", "pie"];
// 예시 데이터: 언어별
const SAMPLE_GRID = (en: boolean) => [[en ? "Item" : "항목", en ? "Value" : "값"], ["A", "12"], ["B", "8"], ["C", "15"]];
const SAMPLE_DIAGRAM = (en: boolean) => (en ? "Draft -> Review : 2 approvals\nReview -> Publish" : "초안 -> 검수 : 2인 승인\n검수 -> 발행");

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// 서식 · 삽입 도구막대
export function InsertBar({ onFormat, onLink, onFootnote, onCite, onTable, onBlock, compact }: Props) {
  const t = useT();
  const lang = useLang();
  const [ask, setAsk] = useState<Ask>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 표
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  // 차트
  const [kind, setKind] = useState<ChartKindX>("bar");
  const [grid, setGrid] = useState<string[][]>(() => SAMPLE_GRID(lang === "en"));
  // 다이어그램
  const [dir, setDir] = useState<"right" | "down">("right");

  const open = (k: Ask) => {
    setAsk(ask === k ? null : k);
    setErr(null);
    setA(k === "diagram" ? SAMPLE_DIAGRAM(lang === "en") : "");
    setB("");
  };
  const keep = (e: React.MouseEvent) => e.preventDefault(); // 편집 선택 유지

  const csv = grid.filter((r) => r.some((c) => c.trim())).map((r) => r.map(csvCell).join(",")).join("\n");
  const chartText = `type: ${kind}${b.trim() ? `\ntitle: ${b.trim()}` : ""}\n${csv}`;
  const diagramText = `${dir === "down" ? "direction: down\n" : ""}${b.trim() ? `title: ${b.trim()}\n` : ""}${a.trim()}`;

  const submit = async () => {
    setErr(null);
    if (ask === "doi") {
      const doi = normalizeDoi(a);
      if (!doi) return setErr(t("DOI 형식 오류 (예: 10.1038/nature12373)", "Invalid DOI (e.g. 10.1038/nature12373)"));
      setBusy(true);
      const ref = await fetchReference(doi);
      setBusy(false);
      if (!ref) return setErr(t("DOI 조회 실패", "DOI lookup failed"));
      onCite(ref.title, ref.url);
    } else if (ask === "link") {
      if (!/^https?:\/\//i.test(b)) return setErr(t("https:// 주소 필요", "Needs an https:// address"));
      onLink?.(a.trim() || b, b.trim());
    } else if (ask === "footnote") {
      if (!a.trim()) return setErr(t("각주 내용 필요", "Footnote text required"));
      onFootnote?.(a.trim());
    } else if (ask === "table") {
      onTable?.(Math.min(Math.max(rows, 1), 30), Math.min(Math.max(cols, 1), 10));
    } else if (ask === "chart") {
      if (grid.length < 2) return setErr(t("데이터 2행 이상", "At least 2 rows"));
      onBlock?.("chart", chartText);
    } else if (ask === "diagram") {
      if (!a.trim()) return setErr(t("관계를 한 줄 이상 입력", "Add at least one line"));
      onBlock?.("diagram", diagramText);
    }
    setAsk(null);
  };

  const setCell = (r: number, c: number, v: string) => setGrid((g) => g.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));

  const tool = (k: Ask, label: string) => (
    <button type="button" className="insert-btn" onMouseDown={keep} onClick={() => open(k)} aria-pressed={ask === k}>{label}</button>
  );

  return (
    <div className="insert-bar">
      <div className="insert-row" role="toolbar" aria-label={t("서식 도구", "Formatting")}>
        {!compact && onFormat && GROUPS.map((g, gi) => (
          <span key={gi} className="insert-group">
            {g.map((f) => (
              <button key={f.k} type="button" className={`insert-btn ${f.cls ? `fmt-${f.cls}` : ""}`} title={t(f.ko, f.en)} aria-label={t(f.ko, f.en)} onMouseDown={keep} onClick={() => onFormat(f.k)}>{f.label}</button>
            ))}
          </span>
        ))}
        <span className="insert-group">
          {!compact && onLink && tool("link", t("링크", "Link"))}
          {!compact && onFootnote && tool("footnote", t("각주", "Note"))}
          {tool("doi", "DOI")}
        </span>
        {!compact && onBlock && (
          <span className="insert-group">
            {onTable && tool("table", t("표", "Table"))}
            {tool("chart", t("차트", "Chart"))}
            {tool("diagram", t("다이어그램", "Diagram"))}
          </span>
        )}
      </div>

      {ask && (
        <form className={`insert-ask ${ask === "chart" || ask === "diagram" ? "insert-ask-wide" : ""}`} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          {ask === "doi" && <input className="input" autoFocus value={a} onChange={(e) => setA(e.target.value)} placeholder={t("DOI 또는 https://doi.org/…", "DOI or https://doi.org/…")} aria-label="DOI" />}
          {ask === "link" && (
            <>
              <input className="input" autoFocus value={a} onChange={(e) => setA(e.target.value)} placeholder={t("표시할 글자", "Link text")} aria-label="Link text" />
              <input className="input" value={b} onChange={(e) => setB(e.target.value)} placeholder="https://" aria-label="URL" />
            </>
          )}
          {ask === "footnote" && <input className="input" autoFocus value={a} onChange={(e) => setA(e.target.value)} placeholder={t("각주 내용", "Footnote text")} aria-label="Footnote" maxLength={600} />}

          {ask === "table" && (
            <span className="insert-inline">
              <label>{t("행", "Rows")} <input type="number" className="input input-num" min={1} max={30} value={rows} onChange={(e) => setRows(Number(e.target.value))} /></label>
              <label>{t("열", "Columns")} <input type="number" className="input input-num" min={1} max={10} value={cols} onChange={(e) => setCols(Number(e.target.value))} /></label>
            </span>
          )}

          {ask === "chart" && (
            <div className="builder">
              <div className="builder-form">
                <div className="insert-inline">
                  <select className="select" value={kind} onChange={(e) => setKind(e.target.value as ChartKindX)} aria-label={t("차트 종류", "Chart type")}>
                    {CHART_KINDS.map((k) => <option key={k} value={k}>{{ bar: t("막대", "Bar"), line: t("선", "Line"), area: t("면적", "Area"), pie: t("원형", "Pie"), scatter: "Scatter" }[k]}</option>)}
                  </select>
                  <input className="input" value={b} onChange={(e) => setB(e.target.value)} placeholder={t("차트 제목", "Chart title")} aria-label="Title" />
                </div>
                <div className="grid-edit" role="table">
                  {grid.map((row, r) => (
                    <div key={r} className="grid-row" role="row">
                      {row.map((v, c) => (
                        <input key={c} className={`grid-cell ${r === 0 ? "grid-head" : ""}`} value={v} onChange={(e) => setCell(r, c, e.target.value)} aria-label={`${r + 1}-${c + 1}`} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="insert-inline">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setGrid((g) => [...g, g[0].map(() => "")])}>+ {t("행", "Row")}</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setGrid((g) => g.map((r, i) => [...r, i === 0 ? t("계열", "Series") : ""]))} disabled={grid[0].length >= 6}>+ {t("열", "Column")}</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setGrid((g) => (g.length > 2 ? g.slice(0, -1) : g))}>− {t("행", "Row")}</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setGrid((g) => (g[0].length > 2 ? g.map((r) => r.slice(0, -1)) : g))}>− {t("열", "Column")}</button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        const rows = text.trim().split(/\r?\n/).map((l) => l.split(/\t|,/).map((c) => c.trim()));
                        if (rows.length > 1) setGrid(rows.slice(0, 40).map((r) => r.slice(0, 6)));
                      } catch { setErr(t("클립보드 읽기 불가", "Clipboard unavailable")); }
                    }}
                  >{t("붙여넣기 (엑셀 · CSV)", "Paste (Excel · CSV)")}</button>
                </div>
              </div>
              <div className="builder-preview"><CsvChart csv={csv} kind={kind} height={200} paper /></div>
            </div>
          )}

          {ask === "diagram" && (
            <div className="builder">
              <div className="builder-form">
                <div className="insert-inline">
                  <select className="select" value={dir} onChange={(e) => setDir(e.target.value as "right" | "down")} aria-label={t("방향", "Direction")}>
                    <option value="right">{t("가로 흐름", "Left → right")}</option>
                    <option value="down">{t("세로 흐름", "Top → bottom")}</option>
                  </select>
                  <input className="input" value={b} onChange={(e) => setB(e.target.value)} placeholder={t("다이어그램 제목", "Diagram title")} aria-label="Title" />
                </div>
                <textarea className="textarea code" style={{ minHeight: 140 }} value={a} onChange={(e) => setA(e.target.value)} aria-label="Diagram" spellCheck={false} />
                <p className="panel-note" style={{ padding: 0 }}>{t("한 줄에 하나: A -> B : 설명 · A -- B (화살표 없음)", "One per line: A -> B : label · A -- B (no arrow)")}</p>
              </div>
              <div className="builder-preview"><DiagramView source={diagramText} /></div>
            </div>
          )}

          <div className="insert-inline">
            <button className="btn btn-sm btn-gold" disabled={busy}>{busy ? "…" : t("삽입", "Insert")}</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsk(null)}>{t("취소", "Cancel")}</button>
            {err && <span className="error-text">{err}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
