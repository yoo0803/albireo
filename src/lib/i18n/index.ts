// 인터페이스 언어: 한 · EN
export type Lang = "ko" | "en";
export const LANG_COOKIE = "lang";
export type T = (ko: string, en: string) => string;

export const isLang = (v: unknown): v is Lang => v === "ko" || v === "en";
export const translator = (lang: Lang): T => (ko, en) => (lang === "en" ? en : ko);

// Accept-Language → 기본 언어
export function fromAcceptLanguage(h: string | null): Lang {
  const first = (h ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ko") || !first ? "ko" : "en";
}

export const dateLocale = (lang: Lang) => (lang === "en" ? "en-AU" : "ko-KR");
