"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";

type View = "canvas" | "list" | "extra";

// 캔버스 · 목록 (· 추가 탭) 보기 전환
export function ViewSwitch({ canvas, list, extra, storageKey = "albireo:webzine-view", listLabel, initial = "canvas" }: { canvas: ReactNode; list: ReactNode; extra?: { label: string; node: ReactNode }; storageKey?: string; listLabel?: string; initial?: "canvas" | "list" }) {
  const KEY = storageKey;
  const t = useT();
  const [view, setView] = useState<View>(initial);
  const hasExtra = !!extra;
  useEffect(() => {
    try {
      // 주소 #series 로 바로 열기
      if (hasExtra && location.hash === "#series") { setView("extra"); return; }
      const v = localStorage.getItem(KEY);
      if (v === "list" || v === "canvas" || (v === "extra" && hasExtra)) setView(v);
    } catch {}
  }, [KEY, hasExtra]);
  const pick = (v: View) => { setView(v); try { localStorage.setItem(KEY, v); } catch {} };
  const order: View[] = [...(initial === "list" ? (["list", "canvas"] as const) : (["canvas", "list"] as const)), ...(extra ? (["extra"] as const) : [])];
  const label = (v: View) => (v === "canvas" ? t("캔버스", "Canvas") : v === "list" ? listLabel ?? t("목록", "List") : extra!.label);
  return (
    <div className="view-switch-wrap" data-view={view}>
      <div className="view-switch" role="group" aria-label={t("보기 방식", "View")}>
        {order.map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => pick(v)}>{label(v)}</button>
        ))}
      </div>
      {view === "canvas" ? canvas : view === "list" ? list : extra?.node}
    </div>
  );
}
