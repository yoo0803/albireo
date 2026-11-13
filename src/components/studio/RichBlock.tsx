"use client";
import { useState } from "react";
import { CsvChart } from "@/components/canvas/CsvChart";
import { DiagramView } from "@/components/article/DiagramView";
import { parseChartBlock } from "@/lib/text/blocks";
import { useT } from "@/lib/i18n/client";

type Props = { lang: string; src: string; onSave: (src: string) => void; onRemove: () => void };

// 일반 작성 모드의 차트 · 다이어그램 블록
export function RichBlock({ lang, src, onSave, onRemove }: Props) {
  const t = useT();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(src);
  const chart = lang === "chart" ? parseChartBlock(src) : null;
  return (
    <div className="rich-block-inner">
      <div className="rich-block-bar">
        <span>{lang === "chart" ? t("차트", "Chart") : t("다이어그램", "Diagram")}</span>
        <span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setV(src); setEdit((x) => !x); }}>{edit ? t("닫기", "Close") : t("수정", "Edit")}</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onRemove}>{t("삭제", "Remove")}</button>
        </span>
      </div>
      {edit ? (
        <div className="stack" style={{ ["--gap" as string]: "6px" }}>
          <textarea className="textarea code" style={{ minHeight: 140 }} value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} aria-label="Source" />
          <button type="button" className="btn btn-sm btn-gold btn-start" onClick={() => { onSave(v); setEdit(false); }}>{t("적용", "Apply")}</button>
        </div>
      ) : chart ? (
        <CsvChart csv={chart.csv} kind={chart.kind} height={220} paper />
      ) : (
        <DiagramView source={src} />
      )}
    </div>
  );
}
