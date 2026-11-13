// 사용 조각: 정적 맵 (번들 분할)
export const PIECES = {
  "binary-stars": () => import("ascii-magic-art/pieces/binary-stars.js"),
  "neural-forward-pass": () => import("ascii-magic-art/pieces/neural-forward-pass.js"),
  "bohr-atom-photon": () => import("ascii-magic-art/pieces/bohr-atom-photon.js"),
  "pixel-paint-program": () => import("ascii-magic-art/pieces/pixel-paint-program.js"),
  "constellation-word": () => import("ascii-magic-art/pieces/constellation-word.js"),
  // 멤버 이니셜 (자체 조각, ascii-magic-art kit 기반)
  "initials-yc": () => import("./initials/yc"),
  "initials-ly": () => import("./initials/ly"),
  "initials-hs": () => import("./initials/hs"),
  "initials-sh": () => import("./initials/sh"),
} as const;

export type PieceName = keyof typeof PIECES;
export const isPiece = (s: string): s is PieceName => s in PIECES;
