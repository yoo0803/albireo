// 분야: 기본 5종 + 기타(자유 입력)
export const FIELDS = [
  { id: "cs", label: "Computing", ko: "컴퓨팅" },
  { id: "englit", label: "English Literature", ko: "영문학" },
  { id: "klit", label: "Korean Literature", ko: "국문학" },
  { id: "biz", label: "Business", ko: "경영" },
  { id: "chem", label: "Chemistry", ko: "화학" },
] as const;

export type FieldPreset = (typeof FIELDS)[number]["id"];

export const FIELD_MAX = 40;

export const isPreset = (v: string | null | undefined): v is FieldPreset => FIELDS.some((f) => f.id === v);

// ko: 한글 이름 (작업실 한글 모드)
export const fieldLabel = (v: string, ko = false) => {
  const f = FIELDS.find((x) => x.id === v);
  return f ? (ko ? f.ko : f.label) : v;
};

// 입력 정리: 제어문자 제거 · 길이 제한
export function cleanField(raw: unknown): string | null {
  const v = String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, FIELD_MAX);
  return v || null;
}
