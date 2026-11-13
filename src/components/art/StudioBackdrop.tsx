"use client";
import { usePathname } from "next/navigation";
import { Backdrop } from "./Backdrop";

// 개인 공간(개요 · 복습 · 설정) = 내 톤, 공용 공간(원고 · 토론 · 캔버스) = 청·금
const PERSONAL = ["/studio", "/studio/settings"];

export function StudioBackdrop({ handle, tone }: { handle: string; tone: string | null }) {
  const path = usePathname();
  const personal = PERSONAL.includes(path) && tone;
  return personal ? <Backdrop seed={`studio-${handle}`} tone={tone} /> : <Backdrop seed="albireo-commons" tone="albireo" />;
}
