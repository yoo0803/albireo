import type { SeriesCadence, SeriesKind, SeriesStatus } from "@/types/database";

// 연재 · 정기간행 표기 [국문, 영문]
type L = readonly [string, string];

export const KIND: Record<SeriesKind, L> = {
  serial: ["연재", "Serial"],
  periodical: ["정기간행", "Periodical"],
};

export const CADENCE: Record<SeriesCadence, L> = {
  weekly: ["주간", "Weekly"],
  biweekly: ["격주", "Biweekly"],
  monthly: ["월간", "Monthly"],
  quarterly: ["계간", "Quarterly"],
  irregular: ["비정기", "Irregular"],
};

export const STATUS: Record<SeriesStatus, L> = {
  ongoing: ["연재 중", "Ongoing"],
  paused: ["휴재", "On break"],
  completed: ["완결", "Completed"],
};

// 회차 표기: 연재 n화 · 정기간행 제n호
export const episodeLabel = (kind: SeriesKind, n: number | null, en: boolean) => {
  if (n == null) return en ? "Extra" : "번외";
  if (kind === "periodical") return en ? `No. ${n}` : `제${n}호`;
  return en ? `Ep. ${n}` : `${n}화`;
};

export const pick = (l: L, en: boolean) => (en ? l[1] : l[0]);
