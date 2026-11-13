import { EMPTY_BOARD, migrate, type Board } from "@/lib/board/model";

export type ChartItem = { id: string; title: string; csv: string; note?: string };
export type TimelineItem = { id: string; date: string; title: string; note?: string };
export type MoodItem = { id: string; path: string; caption?: string }; // path: storage 경로 | blob URL

// 보드(카드 · 도형 · 필기)가 예전 노드 · 타임라인을 대신함
export type CanvasDoc = {
  board: Board;
  charts: ChartItem[];
  moodboard: MoodItem[];
};

export const EMPTY_DOC: CanvasDoc = { board: EMPTY_BOARD, charts: [], moodboard: [] };

// jsonb → 문서 (누락 필드 보정)
export function toDoc(raw: unknown): CanvasDoc {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<CanvasDoc> & { nodes?: unknown; edges?: unknown; timeline?: unknown };
  return {
    board: migrate(o),
    charts: Array.isArray(o.charts) ? o.charts : [],
    moodboard: Array.isArray(o.moodboard) ? o.moodboard : [],
  };
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
