"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

// 캔버스 처음 사용법: 단계마다 해당 버튼을 비추고 설명
type Step = { sel?: string; title: [string, string]; body: [string, string] };

const STEPS: Step[] = [
  { title: ["캔버스에 오신 걸 환영합니다", "Welcome to the canvas"], body: ["생각을 카드로 펼치고, 잇고, 묶고, 손으로 적는 작업판입니다. 1분이면 둘러볼 수 있어요.", "A board to lay out ideas as cards, link them, group them and write by hand. This takes a minute."] },
  { sel: ".bd-tools button:nth-child(2)", title: ["손 도구 (기본)", "Hand (default)"], body: ["빈 곳을 끌면 화면이 움직이고, 카드는 그대로 집어 옮길 수 있습니다. 휠이나 두 손가락으로 확대합니다.", "Drag empty space to move around; cards can still be picked up. Zoom with the wheel or two fingers."] },
  { sel: ".bd-svg", title: ["카드 만들기", "Make a card"], body: ["빈 곳을 두 번 누르면 카드가 생기고 바로 글을 쓸 수 있습니다. 다른 곳을 누르면 저장됩니다.", "Double-click empty space to add a card and type. Click elsewhere to save."] },
  { sel: ".bd-svg", title: ["가지 뻗기", "Branch out"], body: ["카드를 고른 뒤 오른쪽 + 손잡이를 끌거나 Tab 키를 누르면 연결된 새 카드가 뻗어 나옵니다. 선을 누르면 곡선 · 직선 · 화살표를 바꿀 수 있습니다.", "Select a card, then drag its + handle or press Tab to branch a linked card. Click a line to change its style."] },
  { sel: ".bd-tools button[aria-label='도형 추가'], .bd-tools button[aria-label='Add shape']", title: ["도형 · 폴더", "Shapes and folders"], body: ["원, 마름모, 메모지, 사건(날짜) 같은 도형을 넣습니다. 바로 아래 버튼은 폴더입니다.", "Add ellipses, diamonds, stickies or dated milestones. The button below makes a folder."] },
  { sel: ".bd-svg", title: ["카드 안에 넣기", "Nest cards"], body: ["카드를 다른 카드나 폴더 위로 끌어 놓으면 안으로 쏙 들어갑니다. 접었다 펼 수 있고, 끌어내면 다시 빠집니다.", "Drop a card onto another card or a folder to tuck it inside. Collapse it, or drag it back out."] },
  { sel: ".bd-tools button:nth-child(3)", title: ["펜으로 쓰기", "Write with the pen"], body: ["색을 고르고 손으로 적습니다. 손떨림 보정은 기본으로 켜져 있고 세기를 조절할 수 있습니다.", "Pick a colour and write by hand. The stabiliser is on by default; adjust its strength."] },
  { sel: ".bd-tools button:nth-child(1)", title: ["사각 · 올가미 선택", "Box or lasso select"], body: ["선택 도구로 영역을 두르면 PNG로 저장하거나 원고에 바로 넣을 수 있습니다. 필기를 고르면 글자로 바꿀 수도 있습니다.", "With the select tool, draw around an area to save it as a PNG or drop it into a manuscript. Selected ink can become text."] },
  { sel: ".bd-top .bd-menu-wrap:nth-of-type(2), .bd-top .bd-menu-wrap:last-of-type", title: ["핀 꽂기", "Pins"], body: ["카드나 영역을 고르고 ‘핀 꽂기’를 누르면 그 자리가 고정됩니다. 📍 메뉴에서 언제든 그 자리로 돌아갈 수 있습니다.", "Select cards or an area and press ‘Pin’ to fix it in place. Jump back any time from the 📍 menu."] },
  { sel: ".bd-top .bd-menu-wrap", title: ["정렬", "Arrange"], body: ["자동 정렬, 고른 카드 · 핀을 가운데 두는 중앙 정렬, 마인드맵, 날짜순 타임트리가 있습니다. Ctrl+Z로 언제든 되돌립니다.", "Auto arrange, centre on a card or pin, mind map, or a time tree by date. Ctrl+Z undoes anything."] },
  { title: ["혼자 쓰고 싶다면", "Keep it to yourself"], body: ["캔버스 제목 옆 🔒 잠금을 켜면 나만 보고 고칠 수 있습니다. 이 안내는 오른쪽 위 ? 에서 다시 볼 수 있습니다.", "Turn on 🔒 next to the title to keep this canvas private. Replay this tour from ? at the top right."] },
];

export function Tour({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const me = useRef<HTMLDivElement>(null);
  const step = STEPS[i];

  // 비출 자리 계산
  useLayoutEffect(() => {
    const root = me.current?.parentElement;
    if (!root || !step.sel) { setBox(null); return; }
    const el = root.querySelector(step.sel);
    if (!el) { setBox(null); return; }
    const R = root.getBoundingClientRect(), r = el.getBoundingClientRect();
    const big = r.width > R.width * 0.8;
    setBox(big ? null : { x: r.left - R.left - 6, y: r.top - R.top - 6, w: r.width + 12, h: r.height + 12 });
  }, [step]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      if (e.key === "ArrowRight") setI((v) => Math.min(STEPS.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onDone]);

  const last = i === STEPS.length - 1;
  // 설명 카드: 비춘 곳 옆 (없으면 가운데)
  const cardStyle: React.CSSProperties = box
    ? { left: Math.min(box.x + box.w + 14, (me.current?.parentElement?.clientWidth ?? 800) - 320), top: Math.max(12, box.y) }
    : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div ref={me} className="bd-tour" role="dialog" aria-modal="true" aria-label={t("캔버스 사용법", "Canvas tour")}>
      {box ? <div className="bd-tour-spot" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} /> : <div className="bd-tour-dim" />}
      <div className="bd-tour-card" style={cardStyle} key={i}>
        <p className="bd-tour-k">{i + 1} / {STEPS.length}</p>
        <b>{t(...step.title)}</b>
        <p>{t(...step.body)}</p>
        <div className="bd-tour-dots">{STEPS.map((_, j) => <i key={j} className={j === i ? "on" : undefined} />)}</div>
        <div className="bd-tour-row">
          <button type="button" className="bd-tour-skip" onClick={onDone}>{t("건너뛰기", "Skip")}</button>
          {i > 0 && <button type="button" className="btn btn-sm" onClick={() => setI(i - 1)}>{t("이전", "Back")}</button>}
          <button type="button" className="btn btn-sm btn-gold" onClick={() => (last ? onDone() : setI(i + 1))} autoFocus>{last ? t("시작하기", "Start") : t("다음", "Next")}</button>
        </div>
      </div>
    </div>
  );
}
