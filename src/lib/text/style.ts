import { FONTS } from "@/content/fonts";

// 원고 서체 설정
export type ArticleStyle = {
  font?: string;
  size?: "s" | "m" | "l" | "xl";
  leading?: "tight" | "normal" | "loose";
  indent?: boolean;
  align?: "left" | "justify";
  cover?: { tpl: string; tone?: string };
};

const SIZE = { s: 0.94, m: 1, l: 1.08, xl: 1.16 } as const;
const LEADING = { tight: 1.65, normal: 1.95, loose: 2.25 } as const;

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => (allowed.includes(v as T) ? (v as T) : undefined);

// 허용 값만 통과
export function cleanStyle(raw: unknown): ArticleStyle {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const cover = r.cover && typeof r.cover === "object" ? (r.cover as Record<string, unknown>) : null;
  const out: ArticleStyle = {
    font: FONTS.some((f) => f.id === r.font) ? (r.font as string) : undefined,
    size: pick(r.size, ["s", "m", "l", "xl"] as const),
    leading: pick(r.leading, ["tight", "normal", "loose"] as const),
    indent: r.indent === true ? true : undefined,
    align: pick(r.align, ["left", "justify"] as const),
    cover: cover && typeof cover.tpl === "string" && /^[a-z-]{1,24}$/.test(cover.tpl)
      ? { tpl: cover.tpl, tone: typeof cover.tone === "string" && /^[a-z]{1,12}$/.test(cover.tone) ? cover.tone : undefined }
      : undefined,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as ArticleStyle;
}

// 본문 래퍼 속성
export function proseProps(s: ArticleStyle) {
  const font = FONTS.find((f) => f.id === s.font);
  return {
    style: {
      ...(font && font.id !== "pretendard" ? { ["--prose-font" as string]: font.family } : {}),
      ["--prose-scale" as string]: String(SIZE[s.size ?? "m"]),
      ["--prose-leading" as string]: String(LEADING[s.leading ?? "normal"]),
    },
    "data-indent": s.indent ? "" : undefined,
    "data-align": s.align === "justify" ? "justify" : undefined,
  };
}

// 개인 기본값: 서체 설정 + 기본 분야
export type Prefs = { style: ArticleStyle; field?: string };
export function cleanPrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const field = typeof r.field === "string" ? r.field.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40) : "";
  return { style: cleanStyle(r.style), ...(field ? { field } : {}) };
}
