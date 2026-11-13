"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

// 시계: 항성시 (GMST) · 서울 · 시드니
type Mode = "gmst" | "seoul" | "sydney";
const MODES: Mode[] = ["gmst", "seoul", "sydney"];
const KEY = "albireo:clock";
const LABEL: Record<Mode, string> = { gmst: "GMST", seoul: "SEL", sydney: "SYD" };
const ZONE: Partial<Record<Mode, string>> = { seoul: "Asia/Seoul", sydney: "Australia/Sydney" };

function gmst(d: Date) {
  const jd = d.getTime() / 864e5 + 2440587.5;
  const h = (((18.697374558 + 24.06570982441908 * (jd - 2451545)) % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ss = Math.floor(((h - hh) * 60 - mm) * 60);
  return [hh, mm, ss].map((v) => String(v).padStart(2, "0")).join(":");
}

const fmt = new Map<string, Intl.DateTimeFormat>();
function zoned(d: Date, tz: string) {
  if (!fmt.has(tz)) fmt.set(tz, new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }));
  return fmt.get(tz)!.format(d);
}

const read = (m: Mode, d: Date) => (m === "gmst" ? gmst(d) : zoned(d, ZONE[m]!));

export function SiderealClock() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("gmst");
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    try { const v = localStorage.getItem(KEY) as Mode | null; if (v && MODES.includes(v)) setMode(v); } catch {}
  }, []);
  useEffect(() => {
    const tick = () => setNow(read(mode, new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mode]);

  const pick = (m: Mode) => { setMode(m); try { localStorage.setItem(KEY, m); } catch {} };
  const name = { gmst: t("항성시", "Sidereal"), seoul: t("서울", "Seoul"), sydney: t("시드니", "Sydney") };

  return (
    <span className="clock coords mono">
      <span className="clock-time" suppressHydrationWarning aria-live="off">{now ?? "--:--:--"}</span>
      <span className="clock-modes" role="group" aria-label={t("시계 기준", "Clock")}>
        {MODES.map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} title={name[m]} onClick={() => pick(m)}>{LABEL[m]}</button>
        ))}
      </span>
    </span>
  );
}
