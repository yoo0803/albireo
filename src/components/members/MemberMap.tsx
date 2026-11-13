import { InfiniteCanvas, type Tile } from "@/components/canvas-home/InfiniteCanvas";
import { CoverTile, LensTile, MemberTile } from "@/components/canvas-home/Tiles";
import { rand } from "@/lib/canvas/cluster";
import type { MemberEntry } from "./MemberGrid";
import type { Lang } from "@/lib/i18n";

const W = 2600, H = 2000, C = { x: W / 2, y: H / 2 };
const MEMBER = { w: 170, h: 236 }, COVER = { w: 124, h: 155 }, HUB = { w: 230, h: 230 };
const ANGLES = [-135, -45, 45, 135].map((d) => (d * Math.PI) / 180);
const PER_RING = 5, STEP = (20 * Math.PI) / 180;

type Pt = { x: number; y: number };
// 곡선 연결: 중점을 수직으로 살짝 밀기
const curve = (a: Pt, b: Pt, bend = 0.18) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  return `M${a.x},${a.y} Q${mx - dy * bend},${my + dx * bend} ${b.x},${b.y}`;
};

// 멤버 마인드맵: 중심 → 멤버 → 발행 글 (공저는 점선)
export function MemberMap({ list, lang }: { list: MemberEntry[]; lang: Lang }) {
  const r = rand("albireo-members");
  const tiles: Tile[] = [];
  const lines: { d: string; disc: string; dashed?: boolean; w: number }[] = [];
  const at = new Map<string, Pt>(); // 글 id → 중심점
  const memberAt = new Map<string, Pt>();

  tiles.push({ id: "hub", x: C.x - HUB.w / 2, y: C.y - HUB.h / 2, ...HUB, node: <LensTile label="Albireo" /> });

  list.forEach(({ m, p }, i) => {
    const a = ANGLES[i % 4];
    const M = { x: C.x + Math.cos(a) * 470, y: C.y + Math.sin(a) * 330 };
    memberAt.set(m.handle, M);
    tiles.push({ id: `m-${m.handle}`, x: M.x - MEMBER.w / 2, y: M.y - MEMBER.h / 2 + 20, ...MEMBER, node: <MemberTile handle={m.handle} name={p?.byline.name ?? m.name} role={m.role} piece={m.piece} /> });
    lines.push({ d: curve(C, M, i % 2 ? 0.12 : -0.12), disc: m.discipline, w: 2 });

    (p?.articles ?? []).slice(0, 15).forEach((art, k) => {
      const ring = Math.floor(k / PER_RING), idx = k % PER_RING;
      const n = Math.min(PER_RING, (p?.articles.length ?? 0) - ring * PER_RING);
      const th = a + (idx - (n - 1) / 2) * STEP + (ring % 2 ? STEP / 2 : 0);
      const rad = 230 + ring * 165;
      const A = { x: M.x + Math.cos(th) * rad * 1.2, y: M.y + Math.sin(th) * rad };
      at.set(art.id, A);
      tiles.push({
        id: `a-${art.id}`, x: Math.round(A.x - COVER.w / 2), y: Math.round(A.y - COVER.h / 2), ...COVER,
        node: <CoverTile a={art} lang={lang} tilt={Math.round((r() - 0.5) * 50) / 10} />,
      });
      lines.push({ d: curve(M, A, (r() - 0.5) * 0.3), disc: m.discipline, w: 1.2 });
    });
  });

  // 공저: 공저자 → 글 (점선)
  list.forEach(({ m, p }) => {
    const M = memberAt.get(m.handle)!;
    p?.coauthored.forEach((art) => {
      const A = at.get(art.id);
      if (A) lines.push({ d: curve(M, A, 0.22), disc: m.discipline, dashed: true, w: 1.2 });
    });
  });

  const svg = (
    <svg className="map-lines" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      {[220, 380, 600].map((rr, k) => (
        <ellipse key={rr} cx={C.x} cy={C.y} rx={rr * 1.3} ry={rr} className={`map-ring map-ring-${k}`} />
      ))}
      {lines.map((l, k) => (
        <path key={k} d={l.d} className="map-line" style={{ stroke: `var(--d-${l.disc}, var(--fg))`, strokeWidth: l.w }} strokeDasharray={l.dashed ? "4 6" : undefined} />
      ))}
    </svg>
  );

  return (
    <InfiniteCanvas
      wrap={false}
      zoom0={0.78}
      className="canvas-members"
      layout={{ tiles: [{ id: "lines", x: 0, y: 0, w: W, h: H, node: svg }, ...tiles], chunk: { w: W, h: H }, focus: C }}
    />
  );
}
