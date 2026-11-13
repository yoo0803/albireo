"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

// 링크 공유: 모바일 공유 시트 · 그 외 복사
export function ShareButton({ url, title, label }: { url: string; title: string; label?: string }) {
  const t = useT();
  const [done, setDone] = useState(false);

  const share = async () => {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      // 클립보드 차단 환경
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };

  return (
    <button type="button" className="share-btn" onClick={share} aria-live="polite">
      <span aria-hidden="true">↗</span> {done ? t("링크 복사됨", "Link copied") : (label ?? t("공유", "Share"))}
    </button>
  );
}
