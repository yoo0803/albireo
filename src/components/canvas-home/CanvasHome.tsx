import Link from "next/link";
import { HomeCanvas } from "./HomeCanvas";
import { CanvasBar } from "./CanvasBar";
import { CoverTile, IslandLabel, LensTile, MemberTile, WordTile } from "./Tiles";
import { rand, type Group } from "@/lib/canvas/cluster";
import { fnv1a } from "@/lib/text/hash";
import { fieldLabel } from "@/content/fields";
import { TEAM } from "@/content/team";
import { OrbitHero } from "@/components/orbit/OrbitHero";
import { ReactDock } from "./ReactTile";
import type { ArticleCard } from "@/lib/data/public";
import type { Lang, T } from "@/lib/i18n";

const MIN_ISLAND = 4;
const TAGS = (star: string) => ["Peer-Reviewed", "β Cygni", "RA 19h30m", "DEC +27°57′", "Webzine", star, "Albireo"];
// 커버 크기: 시드별 150~230
export const coverSize = (seed: string) => {
  const w = 150 + (parseInt(fnv1a(seed), 36) % 9) * 10;
  return { w, h: Math.round(w * 1.25) };
};
// 섬 이름 폭: 글자 수 비례
export const labelBox = (id: string, text: string) => ({ id, w: 60 + text.length * 17, h: 56 });

// 메인: 원래 궤도 히어로 + 둘레의 분야별 섬 · 사람들
export function CanvasHome({ articles, lang, t }: { articles: ArticleCard[]; lang: Lang; t: T }) {
  const nodes: Record<string, React.ReactNode> = {};
  const r = rand("albireo-home");
  const tilt = () => Math.round((r() - 0.5) * 60) / 10;

  // 분야별 섬
  const byField = new Map<string, ArticleCard[]>();
  articles.forEach((a) => byField.set(a.discipline, [...(byField.get(a.discipline) ?? []), a]));
  const groups: Group[] = [...byField].map(([f, list]) => {
    const n = Math.max(MIN_ISLAND, list.length);
    const items = Array.from({ length: n }, (_, k) => {
      const a = list[k % list.length];
      const seed = `${a.slug}-${k}`;
      const id = `c-${f}-${k}`;
      nodes[id] = <CoverTile a={a} lang={lang} seed={seed} tilt={tilt()} />;
      return { id, ...coverSize(seed) };
    });
    const label = labelBox(`l-${f}`, fieldLabel(f));
    nodes[label.id] = <IslandLabel text={fieldLabel(f)} />;
    return { id: f, label, items };
  });

  // 사람들
  const people = TEAM.map((m) => {
    const id = `m-${m.handle}`;
    nodes[id] = <MemberTile handle={m.handle} name={m.name} role={m.role} piece={m.piece} />;
    return { id, w: 170, h: 236 };
  });
  const pl = t("사람들", "People");
  nodes["l-people"] = <IslandLabel text={pl} />;
  groups.push({ id: "people", label: labelBox("l-people", pl), items: people });

  // 별: 좌표 · 세로쓰기
  nodes["w-coord"] = <WordTile variant="label" text="β Cygni · RA 19h30m43s · DEC +27°57′35″" />;
  nodes["w-ko"] = <WordTile variant="ko" text={t("천상열차", "Star chart")} />;
  groups.push({ id: "sky", items: [{ id: "w-ko", w: 70, h: 230 }, { id: "w-coord", w: 300, h: 44 }] });

  const hero = (
    <OrbitHero
      embedded
      items={articles.slice(0, 8).map((a) => ({ slug: a.slug, title: lang === "en" && a.title_en ? a.title_en : a.title, discipline: a.discipline, author: a.author.name }))}
      crew={TEAM.map((m) => ({ handle: m.handle, name: m.name, discipline: m.discipline }))}
      tags={TAGS(t("천상열차", "Star chart"))}
    />
  );
  // 반복 단위의 다른 사본: 가벼운 메아리
  const echo = (
    <div className="hero-echo" aria-hidden="true">
      <div className="hero-echo-lens"><LensTile label="β Cygni" /></div>
      <WordTile variant="brand" text="Albireo" />
    </div>
  );

  return (
    <>
      <HomeCanvas
        hero={hero}
        echo={echo}
        groups={groups}
        nodes={nodes}
        overlay={
          <>
            <CanvasBar slugs={articles.map((a) => a.slug)} extra={<ReactDock />} />
            <div className="canvas-hint" aria-hidden="true">
              <span>{t("끌어서 둘러보기", "Drag to explore")}</span>
            </div>
          </>
        }
      />
      {/* 스크린리더 · 검색엔진용 목록 */}
      <nav className="sr-only" aria-label={t("웹진 목록", "Webzine index")}>
        <ul>{articles.map((a) => <li key={a.id}><Link href={`/articles/${a.slug}`}>{lang === "en" && a.title_en ? a.title_en : a.title}</Link></li>)}</ul>
        <ul>{TEAM.map((m) => <li key={m.handle}><Link href={`/authors/${m.handle}`}>{m.name}</Link></li>)}</ul>
      </nav>
    </>
  );
}
