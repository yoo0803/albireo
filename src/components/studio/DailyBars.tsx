"use client";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n";

type Day = { day: string; visitors: number; views: number };

// 일별 방문자: 막대 1계열 + 마우스 위 상세
export function DailyBars({ data, days }: { data: Day[]; days: number }) {
  const t = useT();
  const lang = useLang();
  const [hover, setHover] = useState<number | null>(null);
  // 빈 날 채우기 (오늘까지)
  const end = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date()) + "T00:00:00Z");
  const map = new Map(data.map((d) => [d.day, d]));
  const series: Day[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));
    const k = d.toISOString().slice(0, 10);
    return map.get(k) ?? { day: k, visitors: 0, views: 0 };
  });
  const max = Math.max(1, ...series.map((d) => d.visitors));
  const W = 720, H = 180, gap = 2, bw = (W - gap * (series.length - 1)) / series.length;
  const fmt = (k: string) => new Date(k + "T00:00:00Z").toLocaleDateString(dateLocale(lang), { month: "short", day: "numeric", timeZone: "UTC" });
  const h = hover !== null ? series[hover] : null;
  const ticks = [0, Math.round(max / 2), max];

  return (
    <figure className="daily">
      <div className="daily-tip" aria-live="polite" data-on={h ? "" : undefined}>
        {h ? <><b>{fmt(h.day)}</b> · {h.visitors} {t("명", "visitors")} · {h.views} {t("페이지뷰", "views")}</> : t("막대에 마우스를 올려 보세요", "Hover a bar")}
      </div>
      <div className="daily-plot">
      <div className="daily-y" aria-hidden="true">{[...ticks].reverse().map((v) => <span key={v}>{v}</span>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={t("일별 방문자 수", "Daily visitors")} onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => <line key={v} x1="0" x2={W} y1={H - (v / max) * H} y2={H - (v / max) * H} className="daily-grid" vectorEffect="non-scaling-stroke" />)}
        {series.map((d, i) => {
          const bh = (d.visitors / max) * H;
          const x = i * (bw + gap);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${fmt(d.day)}: ${d.visitors}`}>
              <rect x={x} y={0} width={bw + gap} height={H} fill="transparent" />
              {bh > 0 && <path d={`M${x},${H} V${H - bh + Math.min(4, bh)} q0,-${Math.min(4, bh)} ${Math.min(4, bw / 2)},-${Math.min(4, bh)} H${x + bw - Math.min(4, bw / 2)} q${Math.min(4, bw / 2)},0 ${Math.min(4, bw / 2)},${Math.min(4, bh)} V${H} Z`} className="daily-bar" data-on={hover === i ? "" : undefined} />}
            </g>
          );
        })}
      </svg>
      </div>
      <div className="daily-x" aria-hidden="true"><span>{fmt(series[0].day)}</span><span>{fmt(series.at(-1)!.day)}</span></div>
      {/* 표 보기 */}
      <details className="daily-table">
        <summary className="label faint">{t("표로 보기", "View as table")}</summary>
        <table className="table">
          <thead><tr><th>{t("날짜", "Date")}</th><th>{t("방문자", "Visitors")}</th><th>{t("페이지뷰", "Views")}</th></tr></thead>
          <tbody>{[...series].reverse().filter((d) => d.views).map((d) => <tr key={d.day}><td>{fmt(d.day)}</td><td>{d.visitors}</td><td>{d.views}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
