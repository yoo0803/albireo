"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const VISITOR = "albireo:visitor";
// 집계 제외: 작업실 · 로그인 · 내부
const SKIP = /^\/(studio|auth|api|login)(\/|$)/;

// 방문 기록: 쿠키 없음, 익명 ID (조회수와 공용)
export function VisitBeacon() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (!path || SKIP.test(path)) return;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return;
    let v: string | null = null;
    try {
      v = localStorage.getItem(VISITOR);
      if (!v) { v = crypto.randomUUID(); localStorage.setItem(VISITOR, v); }
    } catch { return; }
    // 외부 유입 경로는 첫 페이지에서만
    const r = first.current ? document.referrer : "";
    first.current = false;
    const body = JSON.stringify({ p: path, r, v });
    if (!navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }))) {
      fetch("/api/visit", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  }, [path]);
  return null;
}
