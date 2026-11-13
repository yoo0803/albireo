"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { THEME_COOKIE, isFixedTheme, type Theme } from "@/lib/theme";

// 테마 전환: 시스템 → 라이트 → 다크 (쿠키 1년)
const ORDER: Theme[] = ["system", "light", "dark"];

function Icon({ m }: { m: Theme }) {
  if (m === "light") return (<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="currentColor" /><g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="8" y1="1.6" x2="8" y2="3" transform={`rotate(${a} 8 8)`} />)}</g></svg>);
  if (m === "dark") return (<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.8 2.2A6 6 0 1 0 13.8 11 5 5 0 0 1 10.8 2.2Z" fill="currentColor" /></svg>);
  return (<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M8 2.4a5.6 5.6 0 0 1 0 11.2Z" fill="currentColor" /></svg>);
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const t = useT();
  const [mode, setMode] = useState<Theme>(initial);
  useEffect(() => setMode(initial), [initial]);

  const pick = () => {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    setMode(next);
    const root = document.documentElement;
    if (isFixedTheme(next)) {
      root.dataset.theme = next;
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } else {
      delete root.dataset.theme;
      document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
  };
  const name = { system: t("시스템 설정", "System"), light: t("라이트 모드", "Light"), dark: t("다크 모드", "Dark") }[mode];
  return (
    <button type="button" className="theme-toggle" onClick={pick} title={`${t("화면", "Theme")}: ${name}`} aria-label={`${t("화면 테마", "Theme")}: ${name}`}>
      <Icon m={mode} />
    </button>
  );
}
