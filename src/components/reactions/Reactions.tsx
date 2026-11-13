"use client";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

// 좋아요: 작은 로켓맨 (금빛 머리 · 푸른 몸, 알비레오 두 별 색) · 싫어요: 똥 날리기 (숫자 없음)

function Rocketeer() {
  return (
    <svg className="rk-svg" viewBox="0 0 24 32" aria-hidden="true">
      <g className="rk-flame">
        <path d="M12 22.6c-3.8 2.8-4.9 6.2-2.5 9.4.6-1.4 1.4-2.1 2.5-2.4 1.1.3 1.9 1 2.5 2.4 2.4-3.2 1.3-6.6-2.5-9.4Z" fill="#e8552d" />
        <path d="M12 23.6c-2.2 1.8-2.8 3.9-1.5 5.9.4-.8.9-1.2 1.5-1.4.6.2 1.1.6 1.5 1.4 1.3-2 .7-4.1-1.5-5.9Z" fill="var(--gold)" />
      </g>
      <g className="rk-body">
        <path d="M9.3 14.6 7.2 11.4M14.7 14.6l2.1-3.2" stroke="var(--blue)" strokeWidth="2.3" strokeLinecap="round" fill="none" />
        <rect x="9.6" y="19" width="2" height="4.4" rx="1" fill="var(--blue)" />
        <rect x="12.4" y="19" width="2" height="4.4" rx="1" fill="var(--blue)" />
        <rect x="8.4" y="12.6" width="7.2" height="8.6" rx="3.6" fill="var(--blue)" />
        <circle cx="12" cy="8.2" r="4.7" fill="var(--gold)" />
      </g>
    </svg>
  );
}

// 카드 · 목록용 작은 로켓맨
export function RocketGlyph() {
  return (
    <svg className="rk-glyph" viewBox="0 0 24 32" aria-hidden="true">
      <path d="M9.3 14.6 7.2 11.4M14.7 14.6l2.1-3.2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" fill="none" />
      <rect x="9.6" y="19" width="2" height="4.4" rx="1" fill="currentColor" />
      <rect x="12.4" y="19" width="2" height="4.4" rx="1" fill="currentColor" />
      <rect x="8.4" y="12.6" width="7.2" height="8.6" rx="3.6" fill="currentColor" />
      <circle cx="12" cy="8.2" r="4.7" fill="var(--gold)" />
      <path d="M12 24.4c-1.9 1.6-2.3 3.4-1.2 5 .3-.7.7-1.1 1.2-1.2.5.1.9.5 1.2 1.2 1.1-1.6.7-3.4-1.2-5Z" fill="var(--gold)" />
    </svg>
  );
}

// 똥: 세 단 · 얼굴 없음
export function Poop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 30" aria-hidden="true">
      <path d="M3.4 24.4c0-2.9 2.6-4.5 5.6-4.5h14c3 0 5.6 1.6 5.6 4.5s-2.6 4.4-5.6 4.4H9c-3 0-5.6-1.5-5.6-4.4Z" fill="#8a5a2b" />
      <path d="M6.8 17.6c0-2.5 2.2-3.9 4.8-3.9h8.8c2.6 0 4.8 1.4 4.8 3.9 0 2.3-2.2 3.5-4.8 3.5h-8.8c-2.6 0-4.8-1.2-4.8-3.5Z" fill="#9d6934" />
      <path d="M10.4 11.8c0-2.4 2.2-4.1 4.9-4.3L17 4.2l1.7 3.3c2.5.4 4.5 2 4.5 4.3 0 1.6-1.7 2.6-3.8 2.6h-5.7c-2.1 0-3.7-1-3.7-2.6Z" fill="#b07a3e" />
    </svg>
  );
}

type Fling = { id: number; x: number; y: number; r: number; s: number };
let seq = 0;

export function Reactions({
  liked,
  likes,
  onToggle,
  busy = false,
  size = "md",
}: {
  liked: boolean;
  likes: number;
  onToggle: () => Promise<boolean | null> | boolean | null;
  busy?: boolean;
  size?: "md" | "lg";
}) {
  const t = useT();
  const [phase, setPhase] = useState<"idle" | "launch" | "land">("idle");
  const [bump, setBump] = useState(0);
  const [flings, setFlings] = useState<Fling[]>([]);
  const [squish, setSquish] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const like = async () => {
    if (busy || phase === "launch") return;
    const next = await onToggle();
    if (next == null) return;
    if (timer.current) clearTimeout(timer.current);
    setPhase(next ? "launch" : "land");
    setBump((b) => b + 1);
    timer.current = setTimeout(() => setPhase("idle"), next ? 1200 : 500);
  };

  // 똥: 누를 때마다 하나를 앞으로 던지듯 (짧은 포물선)
  const poop = () => {
    // 바로 선 모양 그대로 살짝만 기울며 날아감
    const add = { id: ++seq, x: 58 + Math.random() * 22, y: -(22 + Math.random() * 10), r: 28 + Math.random() * 22, s: 1 };
    setFlings((f) => [...f.slice(-3), add]);
    setSquish((v) => v + 1);
  };

  return (
    <div className={`rx rx-${size}`}>
      <button
        type="button"
        className="rx-like"
        data-phase={phase}
        data-on={liked || undefined}
        aria-pressed={liked}
        aria-label={liked ? t(`좋아요 취소 (${likes})`, `Unlike (${likes})`) : t(`좋아요 (${likes})`, `Like (${likes})`)}
        onClick={like}
        disabled={busy}
      >
        <span className="rk-pad">
          <span className="rk"><Rocketeer /></span>
          <span className="rk-trail" aria-hidden="true" />
          <span className="rk-cloud" aria-hidden="true" />
          <span className="rk-smoke" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="rk-space" aria-hidden="true" />
          <span className="rk-stars" aria-hidden="true"><i /><i /><i /></span>
        </span>
        <span className="rx-count mono" key={bump}>{likes}</span>
      </button>
      <button type="button" className="rx-poop" onClick={poop} aria-label={t("별로예요", "Not for me")} title={t("별로예요", "Not for me")}>
        <span className="rx-poop-icon" key={squish}><Poop /></span>
        {flings.map((f) => (
          <span
            key={f.id}
            className="rx-fling"
            style={{ ["--x" as string]: `${f.x}px`, ["--y" as string]: `${f.y}px`, ["--r" as string]: `${f.r}deg`, ["--s" as string]: f.s }}
            onAnimationEnd={() => setFlings((all) => all.filter((x) => x.id !== f.id))}
            aria-hidden="true"
          >
            <Poop />
          </span>
        ))}
      </button>
    </div>
  );
}
