import { fnv1a } from "./hash";

export type Sentence = { id: string; raw: string };

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("ko", { granularity: "sentence" })
    : null;

// 문장 분할 (Segmenter 우선, 정규식 폴백)
export function splitSentences(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (segmenter) {
    return Array.from(segmenter.segment(t), (s) => s.segment.trim()).filter(Boolean);
  }
  return t.split(/(?<=[.!?。？！]|다\.)\s+/).map((s) => s.trim()).filter(Boolean);
}

// 주석 기준 평문 (마크업 제거)
function plainOf(raw: string): string {
  return raw
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// 문서 단위 id 발급기: 동일 문장 중복 시 순번
export function sentenceIdFactory() {
  const seen = new Map<string, number>();
  return (raw: string) => {
    const base = fnv1a(plainOf(raw));
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return `s-${base}${n ? `-${n}` : ""}`;
  };
}
