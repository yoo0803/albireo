"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { TEAM } from "@/content/team";
import { usePathname } from "next/navigation";
import { Cover } from "@/components/art/Cover";
import { Seal } from "@/components/art/Seal";
import { SubscribeForm } from "./SubscribeForm";
import { useT } from "@/lib/i18n/client";

const EVT = "albireo:menu";

// 외부(히어로)에서 목차 열기
export const openScrapbook = () => dispatchEvent(new Event(EVT));

// 현대미술 스크랩북 목차
export function ScrapMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [path]);

  // 링크 클릭: 닫기 + 같은 페이지 앵커는 잠금 해제 후 스크롤
  const onBoardClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    setOpen(false);
    if (href.startsWith("/#") && location.pathname === "/") {
      e.preventDefault();
      history.replaceState(null, "", href);
      requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector(href.slice(1))?.scrollIntoView({ behavior: "smooth" })));
    }
  };

  useEffect(() => {
    const on = () => setOpen(true);
    addEventListener(EVT, on);
    return () => removeEventListener(EVT, on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <nav className="scrap-tabs" aria-label="Primary" data-home={path === "/" || undefined}>
        <Link href="/about" className="scrap-tab scrap-tab-note" style={{ ["--r" as string]: "1.5deg" }}>{t("소개", "About")}</Link>
        <Link href="/articles" className="scrap-tab scrap-tab-stamp" style={{ ["--r" as string]: "-3deg" }}>{t("웹진", "Webzine")}</Link>
        <Link href="/members" className="scrap-tab scrap-tab-opt scrap-tab-ticket" style={{ ["--r" as string]: "2deg" }}>{t("멤버", "Members")}</Link>
        <Link href="/studio" className="scrap-tab scrap-tab-ink" style={{ ["--r" as string]: "-1.5deg" }}>{t("작업실", "Studio")}</Link>
        <button type="button" className="scrap-open" aria-expanded={open} aria-controls="scrapbook" onClick={() => setOpen(true)}>
          <span>{t("목차", "Index")}</span><i aria-hidden="true">✦</i>
        </button>
      </nav>

      {open && createPortal(
        <div id="scrapbook" className="scrapbook" role="dialog" aria-modal="true" aria-label={t("목차", "Index")} onClick={onBoardClick}>
          <div className="scrapbook-lattice" aria-hidden="true" />
          <button ref={closeRef} type="button" className="scrap-close" onClick={() => setOpen(false)}>{t("닫기", "Close")} ✕</button>

          <p className="scrap-vert" aria-hidden="true">알비레오</p>

          <div className="scrapbook-board">
            <Link href="/articles" className="scrap scrap-polaroid" style={{ ["--r" as string]: "-6deg", ["--i" as string]: 0 }}>
              <span className="tape" aria-hidden="true" />
              <Cover seed="webzine-scrap" d="albireo" className="scrap-img" label="" />
              <span className="scrap-cap">Webzine</span>
            </Link>

            <Link href="/members" className="scrap scrap-ticket" style={{ ["--r" as string]: "4deg", ["--i" as string]: 1 }}>
              <span className="scrap-kicker">ADMIT FOUR</span>
              <span className="scrap-big">Members</span>
              <span className="scrap-dots" aria-hidden="true">{TEAM.map((m) => <i key={m.handle} data-d={m.discipline} title={m.name} />)}</span>
            </Link>

            <Link href="/studio" className="scrap scrap-card" style={{ ["--r" as string]: "-2deg", ["--i" as string]: 2 }}>
              <span className="tape tape-r" aria-hidden="true" />
              <span className="scrap-kicker">{t("작업실", "Studio")}</span>
              <span className="scrap-big">Studio</span>
            </Link>

            <Link href="/credits" className="scrap scrap-clip" style={{ ["--r" as string]: "7deg", ["--i" as string]: 3 }}>
              <span className="scrap-big" style={{ fontSize: "2rem" }}>Credits</span>
            </Link>

            <Link href="/about" className="scrap scrap-about" style={{ ["--r" as string]: "-4deg", ["--i" as string]: 4 }}>
              <span className="scrap-kicker">{t("Albireo 이야기", "Our story")}</span>
              <span className="scrap-big">About</span>
              <span className="about-pair" aria-hidden="true"><i className="dot-a" /><i className="dot-b" /></span>
            </Link>

            <div className="scrap scrap-seal" style={{ ["--r" as string]: "-9deg", ["--i" as string]: 5 }} aria-hidden="true">
              <Seal char="β" />
            </div>
          </div>
          <div className="scrapbook-sub"><SubscribeForm id="sub-index" /></div>
        </div>,
        document.body,
      )}
    </>
  );
}
