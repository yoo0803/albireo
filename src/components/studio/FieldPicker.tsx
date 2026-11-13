"use client";
import { useState } from "react";
import { FIELDS, FIELD_MAX, isPreset } from "@/content/fields";
import { useT } from "@/lib/i18n/client";

const OTHER = "__other";

type Props = {
  id?: string;
  name?: string; // 서버 폼용 hidden 값
  value: string | null;
  onChange?: (v: string | null) => void;
  none?: string; // 선택 안 함 라벨
  suffix?: string;
};

// 분야 선택: 기본값 + 기타 직접 입력
export function FieldPicker({ id, name, value, onChange, none, suffix = "" }: Props) {
  const t = useT();
  const [v, setV] = useState<string | null>(value);
  const [other, setOther] = useState(!!value && !isPreset(value));
  const update = (x: string | null) => { setV(x); onChange?.(x); };

  return (
    <span className="field-picker">
      <select
        id={id}
        className="select"
        aria-label={id ? undefined : "Field"}
        value={other ? OTHER : (v ?? "")}
        onChange={(e) => {
          const x = e.target.value;
          if (x === OTHER) { setOther(true); update(isPreset(v) ? "" : v); }
          else { setOther(false); update(x || null); }
        }}
      >
        {none !== undefined && <option value="">{none}</option>}
        {FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}{suffix}</option>)}
        <option value={OTHER}>{t("기타", "Other")}</option>
      </select>
      {other && (
        <input
          className="input"
          value={v ?? ""}
          maxLength={FIELD_MAX}
          placeholder={t("분야 입력", "Type a field")}
          aria-label={t("분야 직접 입력", "Custom field")}
          required={!!name}
          onChange={(e) => update(e.target.value)}
        />
      )}
      {name && <input type="hidden" name={name} value={v ?? ""} />}
    </span>
  );
}
