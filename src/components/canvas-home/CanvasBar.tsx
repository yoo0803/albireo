"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

// 캔버스 바: 개수 · (반응 체험) · 아무 글
export function CanvasBar({ slugs, count, extra, random = true }: { slugs: string[]; count?: string; extra?: ReactNode; random?: boolean }) {
  const t = useT();
  const router = useRouter();
  const surprise = () => {
    if (!slugs.length) return;
    router.push(`/articles/${slugs[Math.floor(Math.random() * slugs.length)]}`);
  };
  return (
    <div className="canvas-bar" onPointerDown={(e) => e.stopPropagation()}>
      {count && <span className="canvas-count">{count}</span>}
      {extra}
      {random && slugs.length > 0 && (
        <button type="button" className="canvas-surprise" onClick={surprise}>
          <Die /> {t("아무 글이나", "Random article")}
        </button>
      )}
    </div>
  );
}

// 주사위 눈 셋: 무작위 표시
export function Die() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <rect x="0.6" y="0.6" width="11.8" height="11.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3.6" cy="3.6" r="1.1" fill="currentColor" /><circle cx="6.5" cy="6.5" r="1.1" fill="currentColor" /><circle cx="9.4" cy="9.4" r="1.1" fill="currentColor" />
    </svg>
  );
}
