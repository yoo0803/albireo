"use client";
import { useEffect, useState } from "react";
import { ArticleCard } from "./ArticleCard";
import { SORTS, sortArticles, type SortMode } from "@/lib/sort";
import type { ArticleCard as Card } from "@/lib/data/public";
import { useT } from "@/lib/i18n/client";

const KEY = "albireo:sort";

// 정렬 칩 + 카드 그리드
export function SortedGrid({ list, empty, remember = true }: { list: Card[]; empty?: string; remember?: boolean }) {
  const t = useT();
  const [mode, setMode] = useState<SortMode>("latest");
  useEffect(() => {
    if (!remember) return;
    try { const m = localStorage.getItem(KEY) as SortMode | null; if (m && SORTS.some((s) => s.k === m)) setMode(m); } catch {}
  }, [remember]);
  const pick = (m: SortMode) => {
    setMode(m);
    if (remember) try { localStorage.setItem(KEY, m); } catch {}
  };
  if (!list.length) return <p className="dim">{empty ?? t("아직 공개된 글이 없습니다.", "Nothing published yet.")}</p>;
  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <div className="sort-row" role="group" aria-label={t("정렬", "Sort")}>
        {SORTS.map((s) => (
          <button key={s.k} type="button" className="chip" aria-pressed={mode === s.k} onClick={() => pick(s.k)}>{t(s.ko, s.en)}</button>
        ))}
      </div>
      <div className="article-grid">{sortArticles(list, mode).map((a, i) => <ArticleCard key={a.id} a={a} index={i} />)}</div>
    </div>
  );
}
