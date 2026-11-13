"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { RocketGlyph } from "@/components/reactions/Reactions";
import { useT } from "@/lib/i18n/client";

// 작업실 소개 영상: 실제 화면을 본뜬 모션 (쓰기 → 검수 → 토론 → 캔버스 → 데이터 → 발행)
const D = [7.5, 7, 7, 10, 7, 7]; // 장면 길이 (초)
const AT = D.map((_, i) => D.slice(0, i).reduce((a, b) => a + b, 0));
const N = D.length;
const T = D.reduce((a, b) => a + b, 0);

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const out3 = (x: number) => 1 - Math.pow(1 - x, 3);
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x: number) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const typed = (s: string, t: number, a: number, b: number) => [...s].slice(0, Math.round([...s].length * prog(t, a, b))).join("");

// 커서 경로: [시각, 목표] 목표 = [x%, y%] 또는 data-pt 이름 (":l" 왼쪽 끝 · ":r" 오른쪽 끝)
type Pt = { x: number; y: number };
type Key = [number, [number, number] | string];
function locate(root: HTMLElement | null, k: Key[1]): Pt {
  if (Array.isArray(k)) return { x: k[0], y: k[1] };
  const [name, side] = k.split(":");
  const el = root?.querySelector<HTMLElement>(`[data-pt="${name}"]`);
  if (!root || !el) return { x: 50, y: 50 };
  const R = root.getBoundingClientRect(), r = el.getBoundingClientRect();
  const x = side === "l" ? r.left + 4 : side === "r" ? r.right - 4 : r.left + r.width / 2;
  return { x: ((x - R.left) / R.width) * 100, y: ((r.top + r.height * 0.6 - R.top) / R.height) * 100 };
}
function along(root: HTMLElement | null, keys: Key[], t: number): Pt {
  if (t <= keys[0][0]) return locate(root, keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const A = locate(root, keys[i - 1][1]), B = locate(root, keys[i][1]);
      const e = inOut(prog(t, keys[i - 1][0], keys[i][0]));
      return { x: A.x + (B.x - A.x) * e, y: A.y + (B.y - A.y) * e };
    }
  }
  return locate(root, keys[keys.length - 1][1]);
}
// 클릭 순간 (파동)
const clicks = (times: number[], t: number) => times.map((c) => prog(t, c, c + 0.45)).find((v) => v > 0 && v < 1) ?? 0;

const CURSOR: Key[][] = [
  [[0, [70, 84]], [0.4, "md:r"], [4.8, "md:r"], [5.2, "sum"], [5.6, "sum"], [7.1, [84, 88]]],
  [[0, [84, 88]], [0.5, "sent:l"], [0.7, "sent:l"], [1.8, "sent:r"], [2.15, "gold"], [2.6, "gold"], [3.4, "note"], [6.6, [74, 90]]],
  [[0, [74, 90]], [2.6, "compose"], [4.3, "compose"], [4.6, "send"], [5.0, "send"], [5.6, "like"], [6.0, "like"], [6.6, [80, 90]]],
  [[0, [80, 90]], [1.4, "h-a"], [1.6, "h-a"], [2.6, "dia"], [2.9, "ac"], [3.1, "ac"], [4.3, "slot"], [4.7, "csv"], [4.9, "csv"], [5.9, "folder"], [6.1, "pen"], [6.3, "pen"], [6.6, "ink0"], [7.5, "ink1"], [7.7, "las0"], [8.7, "las1"], [9.0, "ins"], [9.3, "ins"], [9.8, [82, 90]]],
  [[0, [82, 90]], [3.2, "bar3"], [5.5, "bar3"], [6.6, [80, 90]]],
  [[0, [80, 90]], [1.4, [70, 66]], [1.95, "switch"], [2.6, "switch"], [6.6, [84, 92]]],
];
const CLICKS = [[5.3], [0.7, 2.25], [4.6, 5.65], [1.55, 3.0, 4.8, 6.2, 9.1], [], [2.0]];
// 끌기 중인 구간
const GRAB: [number, number][][] = [[], [[0.7, 1.8]], [], [[1.6, 2.6], [3.0, 4.3], [4.8, 5.9], [6.6, 7.5], [7.7, 8.7]], [], []];

export function StudioPromo() {
  const t = useT();
  const [time, setTime] = useState(6.2);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const user = useRef<"play" | "pause" | null>(null);
  const last = useRef<number | null>(null);
  const started = useRef(false);

  // 재생 루프
  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let raf = 0;
    const step = (now: number) => {
      const dt = last.current == null ? 0 : (now - last.current) / 1000;
      last.current = now;
      setTime((v) => (v + Math.min(dt, 0.1)) % T);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // 화면에 보일 때 자동 재생 (움직임 줄이기 설정이면 정지)
  useEffect(() => {
    const el = box.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (user.current === "pause") return;
      const go = e.isIntersecting && document.visibilityState === "visible";
      // 첫 자동 재생은 처음부터
      if (go && !started.current) { started.current = true; setTime(0); }
      setPlaying(go);
    }, { threshold: 0.35 });
    io.observe(el);
    const vis = () => { if (document.visibilityState !== "visible") setPlaying(false); };
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  const toggle = useCallback(() => setPlaying((p) => { user.current = p ? "pause" : "play"; return !p; }), []);
  const seek = (i: number) => { setTime(AT[i] + 0.01); };

  const scene = Math.max(0, AT.findLastIndex((a) => time >= a));
  const l = time - AT[scene];
  const len = D[scene];
  const fade = prog(l, 0, 0.35) * (1 - prog(l, len - 0.35, len));
  const cur = along(box.current, CURSOR[scene], l);
  const ripple = clicks(CLICKS[scene], l);
  const grab = GRAB[scene].some(([a, b]) => l > a && l < b);

  const CAP = [
    [t("마크다운으로 쓰고", "Write in Markdown"), t("## 제목 · **굵게** · > 인용이 바로 보이게", "## headings, **bold**, > quotes, rendered live")],
    [t("문장 단위로 검수하고", "Review by the sentence"), t("여섯 기준의 동료 검수", "Six-point peer review")],
    [t("함께 토론하고", "Talk it through"), t("의견과 근거를 한 스레드에서", "Views and evidence in one thread")],
    [t("캔버스에서 생각을 엮고", "Shape ideas on a canvas"), t("도형 · 연결 · 폴더 · 손글씨까지", "Shapes, links, folders and ink")],
    [t("데이터는 그래프와 표로", "Data as charts and tables"), t("CSV를 올리면 바로 시각화", "Drop a CSV, get a chart")],
    [t("궤도에 올립니다", "Publish to the orbit"), t("발행과 동시에 구독자에게", "Subscribers hear at once")],
  ];
  const NAV = [t("초안", "Draft"), t("검수", "Review"), t("토론", "Debate"), t("캔버스", "Canvas"), t("데이터", "Data"), t("발행", "Publish")];

  return (
    <figure className="promo" aria-label={t("작업실 소개 영상", "Studio preview")}>
      <div ref={box} className="promo-screen" onClick={toggle}>
        <div className="pr-app">
          <nav className="pr-nav">
            {NAV.map((n, i) => (
              <span key={n} className={i === scene ? "on" : undefined}>{n}</span>
            ))}
          </nav>
          <div className="pr-stage" style={{ opacity: fade }}>
            {scene === 0 && <Write l={l} t={t} />}
            {scene === 1 && <Review l={l} t={t} />}
            {scene === 2 && <Debate l={l} t={t} />}
            {scene === 3 && <Canvas l={l} t={t} />}
            {scene === 4 && <Data l={l} t={t} />}
            {scene === 5 && <Publish l={l} t={t} />}
          </div>
        </div>

        {/* 자막 */}
        <div className="pr-cap" key={scene}>
          <span className="pr-cap-no">0{scene + 1} / 0{N}</span>
          <b style={{ transform: `translateY(${(1 - out3(prog(l, 0.1, 0.9))) * 120}%)`, opacity: prog(l, 0.1, 0.6) * (1 - prog(l, len - 0.5, len - 0.05)) }}>{CAP[scene][0]}</b>
          <em style={{ opacity: prog(l, 0.5, 1.1) * (1 - prog(l, len - 0.5, len - 0.05)) }}>{CAP[scene][1]}</em>
        </div>

        {/* 커서 */}
        <span className={`pr-cursor${grab ? " grab" : ""}${scene === 3 && l > 6.3 && l < 7.6 ? " pen" : ""}`} style={{ left: `${cur.x}%`, top: `${cur.y}%` }} aria-hidden="true">
          {ripple > 0 && <i style={{ transform: `scale(${0.4 + ripple * 2})`, opacity: 1 - ripple }} />}
          <svg viewBox="0 0 16 20"><path d="M1 1v15l4-3.6 2.6 6 2.6-1.1-2.6-5.9H13Z" /></svg>
        </span>

        {!playing && (
          <span className="pr-play" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M6 4v12l10-6Z" /></svg></span>
        )}
      </div>

      {/* 재생 막대 */}
      <figcaption className="pr-ctrl">
        <button type="button" onClick={toggle} aria-label={playing ? t("일시정지", "Pause") : t("재생", "Play")}>
          {playing ? <svg viewBox="0 0 20 20"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" /></svg> : <svg viewBox="0 0 20 20"><path d="M6 4v12l10-6Z" /></svg>}
        </button>
        <div className="pr-chapters">
          {NAV.map((n, i) => (
            <button key={n} type="button" onClick={() => seek(i)} aria-label={`${i + 1}. ${CAP[i][0]}`} className={i === scene ? "on" : undefined}>
              <span className="pr-track"><span style={{ width: `${(i < scene ? 1 : i === scene ? l / len : 0) * 100}%` }} /></span>
              <span className="pr-chap">{n}</span>
            </button>
          ))}
        </div>
        <span className="pr-time mono">{`0:${String(Math.floor(time)).padStart(2, "0")}`}</span>
      </figcaption>
    </figure>
  );
}

type SceneProps = { l: number; t: (ko: string, en: string) => string };

// 01 쓰기: 마크다운 → 미리보기
function Write({ l, t }: SceneProps) {
  const src = [
    { md: t("## 연주시차", "## Parallax"), a: 0.4, b: 1.1 },
    { md: t("가까운 별은 1년 주기로 **흔들려** 보입니다.", "Nearby stars **wobble** over a year."), a: 1.2, b: 2.9 },
    { md: t("> 거리는 시차의 역수입니다.", "> Distance is the inverse of parallax."), a: 3.0, b: 3.9 },
    { md: t("- 단위: 파섹(pc)", "- Unit: parsec (pc)"), a: 4.0, b: 4.7 },
  ];
  const shown = src.map((s) => typed(s.md, l, s.a, s.b));
  const caretAt = src.findIndex((s) => l >= s.a && l < s.b + 0.2);
  const f = out3(prog(l, 5.45, 6.1));
  const saved = prog(l, 6.4, 6.7);
  // 미리보기: 각 줄의 마크다운을 그대로 해석
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
  return (
    <div className="pr-md">
      <div className="pr-md-src" data-pt="md">
        <p className="pr-k">Markdown</p>
        {shown.map((s, i) => (
          <p key={i} className="pr-md-line">{s.split(/(##|\*\*|^>|^-)/).map((p, j) => (/^(##|\*\*|>|-)$/.test(p) ? <span key={j} className="pr-md-mark">{p}</span> : p))}{caretAt === i && <i className="pr-caret" />}</p>
        ))}
        <div className="pr-insert">
          {["B", "I", "∑", "</>", "▦", "❝"].map((b, i) => (
            <span key={b} data-pt={i === 2 ? "sum" : undefined} className={i === 2 && l > 5.25 && l < 5.7 ? "hit" : undefined}>{b}</span>
          ))}
        </div>
      </div>
      <div className="pr-md-out">
        <p className="pr-k">{t("미리보기", "Preview")}</p>
        {shown[0].length > 3 && <h4 className="pr-title">{shown[0].replace(/^##\s?/, "")}</h4>}
        {shown[1] && <p className="pr-body">{inline(shown[1])}</p>}
        {shown[2].length > 2 && <blockquote className="pr-quote">{shown[2].replace(/^>\s?/, "")}</blockquote>}
        {shown[3].length > 2 && <ul className="pr-list"><li>{shown[3].replace(/^-\s?/, "")}</li></ul>}
        <div className="pr-math" style={{ opacity: f, transform: `translateY(${(1 - f) * 14}px)`, clipPath: `inset(0 ${(1 - f) * 100}% 0 0)` }}>
          <span>d</span> = <span className="frac"><span>1</span><span>p</span></span>
        </div>
      </div>
      <span className="pr-toast" style={{ opacity: saved, transform: `translateY(${(1 - saved) * 8}px)` }}>✓ {t("자동 저장됨", "Saved")}</span>
    </div>
  );
}

// 02 검수
function Review({ l, t }: SceneProps) {
  const crit = [t("주장", "Claim"), t("출처", "Source"), t("데이터", "Data"), t("관점", "Lens"), t("언어", "Language"), t("윤리", "Ethics")];
  const hl = prog(l, 0.7, 1.8);
  const pop = back(prog(l, 1.85, 2.15));
  const card = out3(prog(l, 2.6, 3.1));
  const verdict = back(prog(l, 6.0, 6.35));
  return (
    <div className="pr-review">
      <div className="pr-doc">
        <p className="pr-dim">{t("두 별은 서로 다른 거리에 있습니다.", "The two stars sit at different distances.")}</p>
        <p className="pr-sent">
          <mark data-pt="sent" style={{ backgroundSize: `${hl * 100}% 100%` }}>{t("가이아 측정으로 두 별의 거리 차이가 드러났습니다.", "Gaia measurements revealed the gap between them.")}</mark>
          <span className="pr-pop" style={{ opacity: clamp(pop), transform: `scale(${0.6 + 0.4 * pop})` }}>
            {["gold", "blue", "rose", "sage"].map((c, i) => <i key={c} data-pt={i === 0 ? "gold" : undefined} className={`d-${c}${i === 0 && l > 2.25 ? " on" : ""}`} />)}
          </span>
        </p>
        <p className="pr-dim">{t("그래서 겉보기 이중성일 가능성이 높습니다.", "So they are most likely an optical double.")}</p>
      </div>
      <aside className="pr-side">
        <div className="pr-note" data-pt="note" style={{ opacity: card, transform: `translateX(${(1 - card) * 24}px)` }}>
          <span className="pr-av">L</span>
          <p>{typed(t("출처를 달아 주세요: Gaia DR3", "Please cite it: Gaia DR3"), l, 3.0, 3.9)}</p>
        </div>
        <ul className="pr-check">
          {crit.map((c, i) => {
            const on = l > 4.0 + i * 0.32;
            return <li key={c} className={on ? "on" : undefined}><span>{on ? "✓" : ""}</span>{c}</li>;
          })}
        </ul>
        <span className="pr-verdict" style={{ opacity: clamp(verdict), transform: `rotate(-6deg) scale(${0.5 + 0.5 * verdict})` }}>{t("승인", "Approved")}</span>
      </aside>
    </div>
  );
}

// 03 토론
function Debate({ l, t }: SceneProps) {
  const posts = [
    { who: "L", c: "gold", name: "L", at: 0.4, txt: t("가이아 DR3의 시차 오차가 꽤 커서, 거리 차이만으로 단정하긴 이른 것 같아요.", "Gaia DR3’s parallax error is large; distance alone isn’t conclusive.") },
    { who: "S", c: "sage", name: "S", at: 1.4, txt: t("고유운동 방향이 다른 건 오차로 설명하기 어려워요. 그쪽이 더 강한 근거예요.", "Their proper motions differ, which errors can’t explain. That’s the stronger evidence.") },
  ];
  const reply = t("그럼 두 근거를 나눠 쓰고, 오차 범위는 표로 붙일게요.", "Then I’ll split the two arguments and add the error ranges as a table.");
  const sent = l > 4.65;
  const r = out3(prog(l, 4.65, 5.1));
  const liked = l > 5.65;
  return (
    <div className="pr-debate">
      <p className="pr-k">{t("토론 · 주제", "Debate · topic")}</p>
      <h4 className="pr-topic">{t("가이아 데이터만으로 결론 내도 될까?", "Can we conclude from Gaia data alone?")}</h4>
      <div className="pr-thread">
        {posts.map((p) => {
          const f = out3(prog(l, p.at, p.at + 0.5));
          return (
            <div key={p.who} className={`pr-post d-${p.c}`} style={{ opacity: f, transform: `translateY(${(1 - f) * 14}px)` }}>
              <span className="pr-av">{p.who}</span>
              <div><small>{p.name} · {t("방금", "just now")}</small><p>{p.txt}</p></div>
            </div>
          );
        })}
        {sent && (
          <div className="pr-post d-blue mine" style={{ opacity: r, transform: `translateY(${(1 - r) * 14}px)` }}>
            <span className="pr-av">Y</span>
            <div><small>Yeji C. · {t("방금", "just now")}</small><p>{reply}</p></div>
            <span className={`pr-like${liked ? " on" : ""}`} data-pt="like"><RocketGlyph /> {liked ? 3 : 2}</span>
          </div>
        )}
      </div>
      {!sent && (
        <div className="pr-compose" data-pt="compose">
          <span>{typed(reply, l, 3.0, 4.3) || <em>{t("의견 남기기…", "Add your view…")}</em>}</span>
          <b data-pt="send" className={l > 4.55 ? "hit" : undefined}>{t("올리기", "Post")}</b>
        </div>
      )}
    </div>
  );
}

// 04 캔버스: 도형 · 연결 · 카드 안에 넣기 · 폴더 수납 · 펜 · 올가미 → 웹진
function Canvas({ l, t }: SceneProps) {
  const pop = (i: number) => back(prog(l, 0.25 + i * 0.18, 0.7 + i * 0.18));
  const link = out3(prog(l, 1.6, 2.6));
  // Ac: 끌어서 A 안으로
  const drag = inOut(prog(l, 3.05, 4.3));
  const nested = l > 4.3;
  const grow = out3(prog(l, 4.3, 4.7));
  // csv 카드: 폴더로 수납
  const stash = inOut(prog(l, 4.9, 5.9));
  const gone = l > 5.9;
  const gulp = Math.sin(prog(l, 5.9, 6.4) * Math.PI);
  const penOn = l > 6.25 && l < 7.9;
  const ink = prog(l, 6.6, 7.5);
  const lasso = prog(l, 7.7, 8.7);
  const bar = out3(prog(l, 8.75, 9.05));
  const done = prog(l, 9.3, 9.6);
  return (
    <div className="pr-cv">
      <div className="pr-cv-tools">
        {["↖", "✋", "✎", "⌫", "⟿"].map((x, i) => <span key={x} data-pt={i === 2 ? "pen" : undefined} className={(i === 2 && penOn) || (i === 0 && !penOn) ? "on" : undefined}>{x}</span>)}
      </div>
      <svg className="pr-cv-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M33 30 C 45 30, 47 62, 58 62" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - link }} />
        <path d="M33 30 C 45 30, 52 18, 64 18" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - out3(prog(l, 0.9, 1.5)) }} />
      </svg>
      {/* 알비레오 A (카드 · 넣으면 커짐) */}
      <div className="pr-cv-card d-gold" style={{ left: "10%", top: "18%", width: "23%", height: `${23 + grow * 15}%`, opacity: clamp(pop(0)), transform: `scale(${0.7 + 0.3 * pop(0)})` }}>
        <span data-pt="h-a" className="pr-cv-h" style={{ opacity: l > 1.2 && l < 2.7 ? 1 : 0 }}>+</span>
        <b>{t("알비레오 A", "Albireo A")}</b>
        <span data-pt="slot" className="pr-cv-slot" style={{ opacity: l > 3.1 && !nested ? 0.8 : 0 }} />
        {nested && <span className="pr-cv-inner" style={{ opacity: grow, transform: `scale(${0.85 + 0.15 * grow})` }}>Ac · B8</span>}
      </div>
      {/* Aa (원) */}
      <div className="pr-cv-shape ellipse d-blue" style={{ left: "64%", top: "10%", opacity: clamp(pop(1)), transform: `scale(${0.7 + 0.3 * pop(1)})` }}><b>Aa · K2 II</b></div>
      {/* 겉보기 이중성? (마름모) */}
      <div data-pt="dia" className="pr-cv-shape diamond d-plum" style={{ left: "57%", top: "50%", opacity: clamp(pop(2)), transform: `scale(${0.7 + 0.3 * pop(2)})` }}><b>{t("겉보기\n이중성?", "Optical\ndouble?")}</b></div>
      {/* Ac (알약): 끌기 */}
      {!nested && (
        <div data-pt="ac" className="pr-cv-shape pill d-sage" style={{ left: `${36 - drag * 22}%`, top: `${72 - drag * 40}%`, opacity: clamp(pop(3)), transform: `scale(${(0.7 + 0.3 * pop(3)) * (1 - drag * 0.25)}) rotate(${Math.sin(drag * Math.PI) * -4}deg)` }}><b>Ac · B8</b></div>
      )}
      {/* 폴더 + csv 카드 */}
      <div data-pt="folder" className="pr-cv-folder" style={{ left: "84%", top: "62%", opacity: clamp(pop(4)), transform: `scale(${(0.7 + 0.3 * pop(4)) * (1 + gulp * 0.1)})` }}>
        <i /><b>{t("자료", "Sources")}</b><small>{gone ? 2 : 1}</small>
      </div>
      {!gone && (
        <div data-pt="csv" className="pr-cv-card d-blue small" style={{ left: `${70 + stash * 17}%`, top: `${36 + stash * 30}%`, opacity: clamp(pop(5)) * (1 - stash * 0.9), transform: `scale(${(0.7 + 0.3 * pop(5)) * (1 - stash * 0.82)})` }}><b>Gaia DR3.csv</b></div>
      )}
      {/* 손글씨 */}
      <svg className="pr-cv-ink" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path data-pt="ink0" d="M50 47 C 52 40, 66 38, 74 44 C 82 50, 80 63, 70 67" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - prog(ink, 0, 0.65) }} />
        <path d="M71 64 l -1 6 l 5 -2" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - prog(ink, 0.65, 1) }} />
        <path className="lasso" d="M44 52 C 44 34, 86 32, 88 50 C 90 72, 52 82, 46 66 C 44 60, 44 56, 44 52" pathLength={1} style={{ strokeDasharray: lasso >= 1 ? "0.012 0.012" : 1, strokeDashoffset: lasso >= 1 ? 0 : 1 - lasso, opacity: lasso > 0 ? 1 : 0 }} />
      </svg>
      <span data-pt="ink1" className="pr-cv-pt" style={{ left: "70%", top: "68%" }} />
      <span data-pt="las0" className="pr-cv-pt" style={{ left: "44%", top: "52%" }} />
      <span data-pt="las1" className="pr-cv-pt" style={{ left: "45%", top: "60%" }} />
      <div className="pr-cv-bar" style={{ opacity: bar, transform: `translate(-50%, ${(1 - bar) * 6}px)` }}>
        <span>{t("필기→글자", "Ink→text")}</span><span>PNG</span><span data-pt="ins" className={l > 9.05 && l < 9.4 ? "hit" : undefined}>{t("웹진에 넣기", "Add to article")}</span>
      </div>
      <span className="pr-toast" style={{ opacity: done, transform: `translateY(${(1 - done) * 8}px)` }}>✓ {t("원고에 넣었습니다", "Added to the manuscript")}</span>
    </div>
  );
}

// 05 데이터: 표 + 막대 그래프
function Data({ l, t }: SceneProps) {
  const rows: [string, number, number][] = [["2019", 120, 80], ["2020", 180, 95], ["2021", 160, 140], ["2022", 240, 170], ["2023", 310, 220]];
  const max = 320;
  const hover = l > 3.4 && l < 5.6;
  const line = rows.map(([, , b], i) => `${10 + i * 20},${100 - (b / max) * 100 * out3(prog(l, 2.0, 3.0))}`).join(" ");
  return (
    <div className="pr-data">
      <div className="pr-tbl">
        <p className="pr-k">{t("관측 데이터.csv", "observations.csv")}</p>
        <table>
          <thead><tr><th>{t("연도", "Year")}</th><th>A</th><th>B</th></tr></thead>
          <tbody>
            {rows.map(([y, a, b], i) => {
              const f = out3(prog(l, 0.3 + i * 0.12, 0.7 + i * 0.12));
              return <tr key={y} className={hover && i === 3 ? "on" : undefined} style={{ opacity: f, transform: `translateX(${(1 - f) * -10}px)` }}><td>{y}</td><td>{a}</td><td>{b}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="pr-chart">
        <div className="pr-grid">{[0, 1, 2, 3].map((i) => <i key={i} />)}</div>
        <div className="pr-bars2">
          {rows.map(([y, a], i) => {
            const h = (a / max) * 100 * out3(prog(l, 1.0 + i * 0.12, 1.9 + i * 0.12));
            return (
              <div key={y} className="pr-bcol">
                <span data-pt={i === 3 ? "bar3" : undefined} className={`pr-bar2${hover && i === 3 ? " on" : ""}`} style={{ height: `${h}%` }} />
                <small>{y}</small>
              </div>
            );
          })}
        </div>
        <svg className="pr-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={line} /></svg>
        <div className="pr-tip2" style={{ opacity: hover ? 1 : 0 }}>
          <span>2022</span><p><i className="a" />A <b>240</b></p><p><i className="b" />B <b>170</b></p>
        </div>
      </div>
    </div>
  );
}

// 06 발행
function Publish({ l, t }: SceneProps) {
  const reveal = out3(prog(l, 0.3, 1.4));
  const on = l > 2.05;
  const seal = back(prog(l, 2.4, 2.8));
  const subs = Math.round(96 + 32 * out3(prog(l, 3.0, 5.0)));
  const views = Math.round(1204 * out3(prog(l, 4.4, 6.4)));
  return (
    <div className="pr-pub">
      <div className="pr-cover">
        <span className="pr-cover-in" style={{ clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)` }}>
          <span className="pr-cover-k">ALBIREO · Nº 05</span>
          <b>{t("빛의 거리를 재는 법", "How to measure starlight")}</b>
        </span>
        <span className="pr-seal" style={{ opacity: clamp(seal * 1.4), transform: `rotate(10deg) scale(${2.2 - 1.2 * seal})` }}>{t("발행", "LIVE")}</span>
      </div>
      <div className="pr-pubside">
        <label className={`pr-switch${on ? " on" : ""}`}><i data-pt="switch" />{on ? t("공개됨", "Public") : t("비공개", "Private")}</label>
        <div className="pr-stat"><span>{t("구독자 수", "Subscribers")}</span><b className="mono">{subs}</b></div>
        <div className="pr-stat"><span>{t("조회", "Views")}</span><b className="mono">{views.toLocaleString("en-US")}</b></div>
      </div>
      {Array.from({ length: 7 }, (_, i) => {
        const f = prog(l, 3.0 + i * 0.22, 3.9 + i * 0.22);
        if (f <= 0 || f >= 1) return null;
        const e = inOut(f);
        return <span key={i} className="pr-mail" style={{ left: `${30 + e * 44}%`, top: `${48 - Math.sin(e * Math.PI) * (18 + i * 3)}%`, opacity: Math.sin(f * Math.PI) }}>✉</span>;
      })}
    </div>
  );
}
