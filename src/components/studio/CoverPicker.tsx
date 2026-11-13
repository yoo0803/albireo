"use client";
import { useState } from "react";
import { CoverArt, COVER_TEMPLATES, COVER_TONES } from "@/components/art/CoverArt";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { fieldLabel } from "@/content/fields";

const TONE_DOT: Record<string, string> = { cs: "#2c5aa0", englit: "#b07a2a", klit: "#c9674a", biz: "#8e4a7c", chem: "#4f8a75", albireo: "linear-gradient(135deg,#c08a1f 50%,#8fb4e8 50%)" };
const MAX = 5_000_000;

type Props = {
  title: string;
  field: string;
  value?: { tpl: string; tone?: string };
  onChange: (v: { tpl: string; tone?: string }) => void;
  coverUrl?: string | null;
  onUpload?: (url: string | null) => void; // 생략 시 업로드 숨김 (기본값 설정용)
};

// 썸네일: 업로드 또는 템플릿 · 톤
export function CoverPicker({ title, field, value, onChange, coverUrl, onUpload }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cur = value ?? { tpl: "oil" };

  const upload = async (f: File) => {
    setErr(null);
    if (!/^image\/(png|jpeg|webp|avif|gif)$/.test(f.type) || f.size > MAX) return setErr(t("PNG / JPG / WEBP, 5MB 이하", "PNG / JPG / WEBP up to 5MB"));
    setBusy(true);
    const ext = f.type.split("/")[1].replace("jpeg", "jpg");
    const sb = supabaseBrowser();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("covers").upload(path, f, { contentType: f.type, upsert: false });
    setBusy(false);
    if (error) return setErr(error.message);
    onUpload?.(sb.storage.from("covers").getPublicUrl(path).data.publicUrl);
  };

  return (
    <div className="stack" style={{ ["--gap" as string]: "12px" }}>
      {onUpload && (
        <div className="insert-inline">
          <label className="btn btn-sm">
            {busy ? "…" : t("이미지 업로드", "Upload image")}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
          </label>
          {coverUrl && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onUpload(null)}>{t("업로드 이미지 제거", "Remove image")}</button>}
          {err && <span className="error-text">{err}</span>}
        </div>
      )}
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", border: "1px solid var(--line)" }} />
      ) : (
        <>
          <div className="cover-pick" role="group" aria-label={t("템플릿", "Template")}>
            {COVER_TEMPLATES.map((c) => (
              <button key={c.id} type="button" aria-pressed={cur.tpl === c.id} onClick={() => onChange({ ...cur, tpl: c.id })}>
                <CoverArt tpl={c.id} tone={cur.tone} field={field} title={title || "Albireo"} kicker={fieldLabel(field)} seed={`pick-${c.id}`} />
                <span>{t(c.ko, c.en)}</span>
              </button>
            ))}
          </div>
          <div className="tone-pick" role="group" aria-label={t("색 톤", "Tone")}>
            <button type="button" aria-pressed={!cur.tone} title={t("분야 색", "Field colour")} style={{ background: "repeating-conic-gradient(var(--line-strong) 0 25%, transparent 0 50%) 50% / 8px 8px" }} onClick={() => onChange({ tpl: cur.tpl })} />
            {COVER_TONES.map((tn) => <button key={tn} type="button" aria-pressed={cur.tone === tn} title={fieldLabel(tn)} style={{ background: TONE_DOT[tn] }} onClick={() => onChange({ ...cur, tone: tn })} />)}
          </div>
        </>
      )}
    </div>
  );
}
