import type { Discipline } from "@/types/database";

// 팀 구성 (이니셜 표기)
export type Member = {
  handle: string;
  name: string;
  discipline: Discipline;
  role: string;
  major: string;
  piece: string; // ascii-magic-art 조각
  bio: string; // 기본값. 운영 시 profiles.bio (각자 설정)
};

export const TEAM: Member[] = [
  { handle: "yeji", name: "Yeji C.", discipline: "cs", role: "Advanced Computing", major: "Advanced Computing", piece: "initials-yc", bio: "" },
  { handle: "englit", name: "L", discipline: "englit", role: "English Literature", major: "English Literature", piece: "initials-ly", bio: "" },
  { handle: "klit", name: "H", discipline: "klit", role: "Korean Literature · Business", major: "Korean Literature · Business", piece: "initials-hs", bio: "" },
  { handle: "chem", name: "S", discipline: "chem", role: "Chemistry", major: "Chemistry", piece: "initials-sh", bio: "" },
];

