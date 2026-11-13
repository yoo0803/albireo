"use client";
import { useEffect, useState } from "react";
import { DisciplineChip } from "@/components/article/DisciplineChip";

// 원고 상단 분야 표시: 편집기 분야 변경 즉시 반영
export function LiveField({ initial, ko }: { initial: string; ko: boolean }) {
  const [d, setD] = useState(initial);
  useEffect(() => {
    const on = (e: Event) => setD(String((e as CustomEvent).detail ?? ""));
    addEventListener("studio-field", on);
    return () => removeEventListener("studio-field", on);
  }, []);
  return d ? <DisciplineChip d={d} ko={ko} /> : null;
}
