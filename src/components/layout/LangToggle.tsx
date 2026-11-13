"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useLang } from "@/lib/i18n/client";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

// 한 / EN 전환 (쿠키 1년)
export function LangToggle() {
  const lang = useLang();
  const router = useRouter();
  const [busy, start] = useTransition();
  const set = (l: Lang) => {
    if (l === lang) return;
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  return (
    <div className="lang-toggle" role="group" aria-label="Language" aria-busy={busy}>
      <button type="button" aria-pressed={lang === "ko"} onClick={() => set("ko")} lang="ko">한</button>
      <button type="button" aria-pressed={lang === "en"} onClick={() => set("en")} lang="en">EN</button>
    </div>
  );
}
