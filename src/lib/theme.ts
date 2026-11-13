// 화면 테마: 시스템 · 라이트 · 다크 (쿠키 없음 = 시스템)
export type Theme = "system" | "light" | "dark";
export const THEME_COOKIE = "theme";
export const isFixedTheme = (v: unknown): v is "light" | "dark" => v === "light" || v === "dark";
