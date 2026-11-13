"use client";
import { FONTS } from "@/content/fonts";
import { useT } from "@/lib/i18n/client";
import type { ArticleStyle } from "@/lib/text/style";

const SIZES = ["s", "m", "l", "xl"] as const;
const LEADINGS = ["tight", "normal", "loose"] as const;

// 서체 · 크기 · 줄간격 · 들여쓰기 · 정렬
export function StyleControls({ value, onChange }: { value: ArticleStyle; onChange: (s: ArticleStyle) => void }) {
  const t = useT();
  const set = <K extends keyof ArticleStyle>(k: K, v: ArticleStyle[K]) => onChange({ ...value, [k]: v });
  const seg = <T extends string>(list: readonly T[], cur: T, k: keyof ArticleStyle, label: (x: T) => string) => (
    <div className="seg" role="group">
      {list.map((x) => <button key={x} type="button" aria-pressed={cur === x} onClick={() => set(k, x as never)}>{label(x)}</button>)}
    </div>
  );
  return (
    <div className="stack" style={{ ["--gap" as string]: "12px" }}>
      <div className="field">
        <label htmlFor="font">{t("본문 글꼴", "Body font")}</label>
        <select id="font" className="select" value={value.font ?? "pretendard"} onChange={(e) => set("font", e.target.value)}>
          <optgroup label={t("한글", "Korean")}>{FONTS.filter((f) => f.script === "ko").map((f) => <option key={f.id} value={f.id}>{t(f.name, f.nameEn ?? f.name)}</option>)}</optgroup>
          <optgroup label={t("영문", "Latin")}>{FONTS.filter((f) => f.script === "latin").map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>
        </select>
      </div>
      <div className="field">
        <label>{t("글자 크기", "Text size")}</label>
        {seg(SIZES, value.size ?? "m", "size", (x) => ({ s: t("작게", "S"), m: t("보통", "M"), l: t("크게", "L"), xl: t("아주 크게", "XL") })[x])}
      </div>
      <div className="field">
        <label>{t("줄간격", "Line spacing")}</label>
        {seg(LEADINGS, value.leading ?? "normal", "leading", (x) => ({ tight: t("좁게", "Tight"), normal: t("보통", "Normal"), loose: t("넓게", "Loose") })[x])}
      </div>
      <div className="field">
        <label>{t("문단", "Paragraphs")}</label>
        <div className="seg" role="group">
          <button type="button" aria-pressed={!!value.indent} onClick={() => set("indent", value.indent ? undefined : true)}>{t("첫 줄 들여쓰기", "First-line indent")}</button>
          <button type="button" aria-pressed={value.align === "justify"} onClick={() => set("align", value.align === "justify" ? undefined : "justify")}>{t("양쪽 정렬", "Justify")}</button>
        </div>
      </div>
    </div>
  );
}
