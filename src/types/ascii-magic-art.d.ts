// ascii-magic-art (MIT) 타입 선언
declare module "ascii-magic-art/pieces/*.js" {
  export const meta: { slug: string; name: string; cols: number; rows: number; fps: number; palette: Record<string, string>; cell?: string; still?: boolean };
  const create: () => (t: number) => string | { text: string; color: string };
  export default create;
}

declare module "ascii-magic-art/lib/kit.js" {
  export class Grid {
    constructor(cols: number, rows: number);
    cols: number;
    rows: number;
    clear(ch?: string, co?: string): this;
    set(x: number, y: number, ch: string, co?: string): void;
    get(x: number, y: number): string;
    text(x: number, y: number, s: string, co?: string): void;
    frame(): string | { text: string; color: string };
  }
  export function palette(hexes: string[]): Record<string, string>;
}

declare module "ascii-magic-art/runtime/player.js" {
  type Look = { look?: string; chars?: string; all?: boolean; mono?: boolean; contrast?: number };
  export function play(
    pre: HTMLPreElement,
    mod: unknown,
    opts?: { speed?: number; still?: boolean; look?: Look; maxFps?: number; t0?: number },
  ): () => void;
}
