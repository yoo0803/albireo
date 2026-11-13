import { InfiniteCanvas, type Tile } from "./InfiniteCanvas";
import { CanvasBar } from "./CanvasBar";
import { CoverTile, IslandLabel, ThreadTile, WordTile } from "./Tiles";
import { coverSize, labelBox } from "./CanvasHome";
import { cluster, rand, type Group } from "@/lib/canvas/cluster";
import { fieldLabel } from "@/content/fields";
import type { ArticleCard, SeriesSummary } from "@/lib/data/public";
import type { Lang } from "@/lib/i18n";

type Spot = { id: string; x: number; y: number; w: number; h: number };
// 연재 한 묶음: 회차 표지를 물결 모양으로 늘어놓고 꼭대기를 실로 이음
function threadLayout(s: SeriesSummary, r: () => number) {
  const covers: Spot[] = [];
  let x = 170;
  s.episodes.forEach((e, i) => {
    const { w, h } = coverSize(e.slug);
    covers.push({ id: e.id, x, y: 130 + Math.round(Math.sin(i * 1.15 + r() * 0.6) * 30) + (i % 2 ? 20 : 0), w, h });
    x += w + 64 + Math.round(r() * 30);
  });
  const W = x + 120, H = Math.max(...covers.map((c) => c.y + c.h)) + 70;
  const pins = covers.map((c) => [c.x + c.w / 2, c.y - 3] as [number, number]);
  return { covers, pins, W, H };
}

// 웹진: 분야별 섬 (반복 없이 한 편씩) + 연재는 실로 이어진 묶음
export function CanvasWebzine({ articles, lang, series = [] }: { articles: ArticleCard[]; lang: Lang; series?: SeriesSummary[] }) {
  const nodes = new Map<string, React.ReactNode>();
  const r = rand("albireo-webzine");
  const threaded = new Set(series.flatMap((s) => s.episodes.map((e) => e.id)));
  const byField = new Map<string, ArticleCard[]>();
  articles.filter((a) => !threaded.has(a.id)).forEach((a) => byField.set(a.discipline, [...(byField.get(a.discipline) ?? []), a]));
  const groups: Group[] = [...byField].map(([f, list]) => {
    nodes.set(`l-${f}`, <IslandLabel text={fieldLabel(f)} />);
    return {
      id: f,
      label: labelBox(`l-${f}`, fieldLabel(f)),
      items: list.map((a) => {
        nodes.set(a.id, <CoverTile a={a} lang={lang} tilt={Math.round((r() - 0.5) * 60) / 10} />);
        return { id: a.id, ...coverSize(a.slug) };
      }),
    };
  });

  // 연재: 묶음 하나를 자리 하나로 배치한 뒤 실 · 표지로 펼침
  const threads = new Map<string, ReturnType<typeof threadLayout> & { s: SeriesSummary }>();
  for (const s of series) {
    const t = threadLayout(s, r);
    threads.set(`t-${s.id}`, { ...t, s });
    groups.push({ id: `t-${s.id}`, items: [{ id: `t-${s.id}`, w: t.W, h: t.H }] });
  }

  // 단위 크기: 글 수에 비례
  const s = Math.sqrt(Math.max(4, articles.length) / 8);
  const W = Math.round(2300 * s), H = Math.round(1700 * s);
  const count = lang === "en" ? `${articles.length} pieces` : `${articles.length}편`;
  nodes.set("title", <WordTile variant="brand" text="Webzine" sub={count} />);
  const placed = cluster({ id: "title", w: 360, h: 130 }, groups, { w: W, h: H, seed: "albireo-webzine" });

  const tiles: Tile[] = placed.flatMap((p) => {
    const t = threads.get(p.id);
    if (!t) return [{ ...p, node: nodes.get(p.id) }];
    const title = lang === "en" && t.s.title_en ? t.s.title_en : t.s.title;
    const byId = new Map(t.s.episodes.map((e) => [e.id, e]));
    return [
      { ...p, node: <ThreadTile href={`/series/${t.s.slug}`} title={title} pins={t.pins} w={t.W} h={t.H} /> },
      ...t.covers.map((c) => ({ ...c, x: p.x + c.x, y: p.y + c.y, node: <CoverTile a={byId.get(c.id)!} lang={lang} tilt={Math.round((r() - 0.5) * 50) / 10} /> })),
    ];
  });
  return (
    <InfiniteCanvas
      layout={{ tiles, chunk: { w: W, h: H }, focus: { x: W / 2, y: H / 2 } }}
      className="canvas-webzine"
      overlay={<CanvasBar slugs={articles.map((a) => a.slug)} count={count} />}
    />
  );
}
