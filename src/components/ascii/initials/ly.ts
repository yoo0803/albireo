// LY · English Literature: 펜이 일리아스 첫 구절(L)과 마지막 줄(Y)로 이니셜을 써 내려감 · 위쪽 양옆에 부바/키키 (소리와 모양)
import { Grid, palette } from "ascii-magic-art/lib/kit.js";
import { COLS, ROWS, layout, hash, cycle, blank } from "./font";

export const meta = {
  slug: "initials-ly",
  name: "LY · manuscript",
  cols: COLS,
  rows: ROWS,
  fps: 20,
  // 0 크림 · 1 금빛 · 2 호박 · 3 괘선 · 4 붉은 잉크 · 5 작가명
  palette: palette(["#fff7e6", "#ffe2a8", "#f2c27a", "#3b3127", "#e0624f", "#6b5a45"]),
};

const PER = 10;
// 일리아스 1권 첫머리, 새뮤얼 버틀러 영역 (1898, 퍼블릭 도메인)
const ILIAD = "Sing, O goddess, the anger of Achilles son of Peleus, that brought countless ills upon the Achaeans. Many a brave soul did it send hurrying down to Hades, and many a hero did it yield a prey to dogs and vultures, for so were the counsels of Jove fulfilled from the day on which the son of Atreus, king of men, and great Achilles, first fell out with one another.";
// 마지막 줄 (24권 끝)
const ILIAD_END = "Thus, then, did they celebrate the funeral of Hector tamer of horses.";
const caps = (t: string) => t.toUpperCase().replace(/[^A-Z]/g, "");
// L: 첫머리 · Y: 끝맺음
const INK_L = caps(ILIAD), INK_Y = caps(ILIAD_END);
const WORDS = ["Shakespeare", "Homer", "Chaucer", "Milton", "Austen", "Dickens", "Brontë", "Wordsworth", "Keats", "Shelley", "Blake", "Donne", "Spenser", "Byron", "Swift", "Woolf"];
const LINE = "the iliad, book i";

const AX = 1.66; // 글자 칸 가로세로 비
type G = InstanceType<typeof Grid>;
// 안쪽 채움: 둥근 쪽은 촘촘한 o, 뾰족한 쪽은 성긴 *
function fill(g: G, cx: number, cy: number, R: number, f: (a: number) => number, sharp: boolean, co: string, fade: number) {
  for (let y = Math.floor(cy - R * 1.4); y <= Math.ceil(cy + R * 1.4); y++) {
    for (let x = Math.floor(cx - R * AX * 1.4); x <= Math.ceil(cx + R * AX * 1.4); x++) {
      const dx = (x - cx) / AX, dy = y - cy;
      const r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (r > R * f(a) - 0.75 || hash(x, y, 7) > fade) continue;
      if (sharp && (x + y) % 2) continue;
      g.set(x, y, sharp ? "*" : "o", co);
    }
  }
}

// 윤곽 그리기: 둥근 쪽은 O, 뾰족한 쪽은 진행 방향에 맞춘 획 글자
function outline(g: G, cx: number, cy: number, R: number, f: (a: number) => number, sharp: boolean, co: string, fade: number) {
  const steps = 180;
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * Math.PI * 2, b = a + 0.035;
    const x = cx + Math.cos(a) * R * f(a) * AX, y = cy + Math.sin(a) * R * f(a);
    const x2 = cx + Math.cos(b) * R * f(b) * AX, y2 = cy + Math.sin(b) * R * f(b);
    const X = Math.round(x), Y = Math.round(y);
    if (hash(X, Y, 7) > fade) continue;
    let ch = "O";
    if (sharp) {
      const d = (((Math.atan2(y2 - y, (x2 - x) / AX) * 180) / Math.PI) + 360) % 180;
      ch = d < 22.5 || d >= 157.5 ? "-" : d < 67.5 ? "\\" : d < 112.5 ? "|" : "/";
    }
    g.set(X, Y, ch, co);
  }
}

export default function create() {
  const g = new Grid(COLS, ROWS);
  // 이니셜은 조금 작게 · 위로: 아래에 부바/키키 자리
  const L = layout("LY", 3.3, 2.35, 6);
  // 경로 순서 중복 제거
  const seen = new Set<string>();
  const path: [number, number][] = [];
  for (const [x, y] of L.path) {
    const k = `${Math.round(x)},${Math.round(y)}`;
    if (!seen.has(k)) { seen.add(k); path.push([Math.round(x), Math.round(y)]); }
  }

  // 글자별 순번: L 은 시작부터, Y 는 마지막 줄로
  const midX = L.box.x0 + (L.box.x1 - L.box.x0) / 2;
  let nl = 0, ny = 0;
  const ink = path.map(([x]) => (x < midX ? { s: INK_L, i: nl++ } : { s: INK_Y, i: ny++ }));

  return (t: number) => {
    g.clear();
    const { lt, fade } = cycle(t, PER);

    // 괘선 + 흐르는 단어
    for (let y = 3; y < ROWS - 3; y += 4) {
      for (let x = 0; x < COLS; x += 3) g.set(x, y, "·", "3");
      const drift = (t * (1.2 + (y % 3) * 0.4)) % (COLS + 20);
      const w = WORDS[(y / 4 + Math.floor(t / 7)) % WORDS.length | 0];
      g.text(Math.floor(COLS - drift), y - 1, w, "5");
    }

    // 부바 · 키키: 둥근 말과 뾰족한 말 (이니셜 아래 띠, 원형 렌즈 안)
    blank(g, 6, 25, 48, 9);
    const grow = Math.min(1, lt / 1.4);
    const k = 1 - (1 - grow) ** 3;
    const bouba = (a: number) => 1 + 0.17 * Math.sin(3 * a + t * 0.7) + 0.07 * Math.sin(5 * a - t * 0.4);
    const kiki = (a: number) => {
      const u = (((a / (Math.PI * 2)) * 7 + t * 0.04) % 1 + 1) % 1;
      return 0.36 + 0.64 * (1 - Math.abs(u * 2 - 1)) ** 1.6;
    };
    fill(g, 16, 30, 2.8 * k, bouba, false, "2", fade);
    outline(g, 16, 30, 2.8 * k, bouba, false, "1", fade);
    fill(g, 44, 29.5, 3.3 * k, kiki, true, "4", fade);
    outline(g, 44, 29.5, 3.3 * k, kiki, true, "4", fade);
    if (grow >= 1 && fade > 0.3) {
      g.text(24, 31, "bouba", "1");
      g.text(34, 31, "kiki", "4");
    }

    // 펜 진행
    const n = path.length;
    const shown = Math.floor(Math.max(0, Math.min(1, (lt - 0.6) / 4.6)) * n);
    for (let i = 0; i < shown; i++) {
      const [x, y] = path[i];
      if (hash(x, y, 3) > fade) continue;
      const fresh = shown - i < 6;
      const k = ink[i];
      g.set(x, y, k.s[k.i % k.s.length], fresh ? "0" : "1");
      g.set(x + 1, y, k.s[(k.i + 7) % k.s.length], fresh ? "0" : "1");
      if (g.get(x - 1, y) === " ") g.set(x - 1, y, "·", "2");
    }
    if (shown > 0 && shown < n) {
      const [x, y] = path[shown - 1];
      g.set(x + 1, y - 1, "/", "4");
    }

    // 첫 줄 타이핑
    const typed = Math.max(0, Math.min(LINE.length, Math.floor((lt - 5.4) * 9)));
    const caret = Math.floor(t * 2) % 2 ? "_" : " ";
    g.text(Math.floor((COLS - LINE.length) / 2), 5, LINE.slice(0, typed) + (lt < 9 ? caret : ""), "1");
    return g.frame();
  };
}
