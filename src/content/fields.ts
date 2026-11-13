// 분야: 기본 5종 + 기타(자유 입력)
export const FIELDS = [
  { id: "cs", label: "Computing" },
  { id: "englit", label: "English Literature" },
  { id: "klit", label: "Korean Literature" },
  { id: "biz", label: "Business" },
  { id: "chem", label: "Chemistry" },
] as const;

export type FieldPreset = (typeof FIELDS)[number]["id"];

export const FIELD_MAX = 40;

export const isPreset = (v: string | null | undefined): v is FieldPreset => FIELDS.some((f) => f.id === v);

export const fieldLabel = (v: string) => FIELDS.find((f) => f.id === v)?.label ?? v;

// 입력 정리: 제어문자 제거 · 길이 제한
export function cleanField(raw: unknown): string | null {
  const v = String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, FIELD_MAX);
  return v || null;
}
