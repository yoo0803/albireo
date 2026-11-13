"use client";
import { useState } from "react";
import { savePrefs } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";
import type { Prefs } from "@/lib/text/style";
import { StyleControls } from "./StyleControls";
import { FieldPicker } from "./FieldPicker";
import { CoverPicker } from "./CoverPicker";
import { SubmitButton } from "./SubmitButton";

// 개인 기본값: 새 원고에 자동 적용
export function PrefsForm({ initial }: { initial: Prefs }) {
  const t = useT();
  const [p, setP] = useState<Prefs>(initial);
  return (
    <form action={savePrefs} className="panel-body stack" style={{ ["--gap" as string]: "18px" }}>
      <input type="hidden" name="prefs" value={JSON.stringify(p)} />
      <div className="field">
        <label>{t("기본 분야", "Default field")}</label>
        <FieldPicker value={p.field ?? null} onChange={(v) => setP((x) => ({ ...x, field: v ?? undefined }))} none="—" />
      </div>
      <StyleControls value={p.style} onChange={(s) => setP((x) => ({ ...x, style: s }))} />
      <div className="field">
        <label>{t("기본 썸네일", "Default thumbnail")}</label>
        <CoverPicker title="Albireo" field={p.field ?? "albireo"} value={p.style.cover} onChange={(c) => setP((x) => ({ ...x, style: { ...x.style, cover: c } }))} />
      </div>
      <SubmitButton pending="Saving…" className="btn btn-gold btn-start">{t("기본값 저장", "Save defaults")}</SubmitButton>
    </form>
  );
}
