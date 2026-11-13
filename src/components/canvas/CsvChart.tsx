"use client";
import { useId, useMemo } from "react";
import Papa from "papaparse";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ScatterChart, Scatter, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Label,
} from "recharts";
import { coerce, inferColumns, suggestChart, type ChartSpec } from "@/lib/csv/infer";

// 테마 색 (CSS 변수 · 라이트/다크 자동)
const SERIES = ["var(--blue)", "var(--gold)", "var(--rose)", "var(--sage)", "var(--accent)", "var(--fg-dim)"];

type Props = {
  csv?: string;
  rows?: Record<string, unknown>[];
  spec?: ChartSpec | null;
  kind?: ChartSpec["kind"]; // 자동 추론 대신 종류 지정
  height?: number;
  paper?: boolean; // 종이 배경용 색
};

// 큰 수 줄임 (1.2k · 3.4M)
const fmt = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v ?? "");
  const a = Math.abs(n);
  if (a >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${+(n / 1e3).toFixed(1)}k`;
  return Number.isInteger(n) ? n.toLocaleString("en-US") : (+n.toFixed(2)).toLocaleString("en-US");
};

type TipProps = { active?: boolean; label?: unknown; payload?: { name?: string; value?: unknown; color?: string; payload?: { fill?: string } }[] };
function Tip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {label !== undefined && label !== "" && <p className="chart-tip-k">{String(label)}</p>}
      {payload.map((p, i) => (
        <p key={i}><i style={{ background: p.color ?? p.payload?.fill }} /><span>{p.name}</span><b>{fmt(p.value)}</b></p>
      ))}
    </div>
  );
}

// CSV → 자동 차트
export function CsvChart({ csv, rows: given, spec: forced, kind, height = 320 }: Props) {
  const gid = useId().replace(/:/g, "");
  const { rows, spec } = useMemo(() => {
    const raw = given ?? (csv ? Papa.parse<Record<string, unknown>>(csv.trim(), { header: true, skipEmptyLines: true }).data : []);
    const cols = inferColumns(raw);
    const auto = forced ?? suggestChart(cols, raw);
    // 종류 지정: 첫 열 = 항목, 나머지 수치 열
    const spec = kind && auto ? { ...auto, kind } : kind && cols.length > 1 ? { kind, x: cols[0].key, y: cols.slice(1).filter((c) => c.type === "number").map((c) => c.key) } : auto;
    return { rows: coerce(raw, cols), spec };
  }, [csv, given, forced, kind]);

  if (!spec || !rows.length) return <p className="mono faint">No numeric columns</p>;

  const axis = { stroke: "transparent", tick: { fill: "var(--fg-faint)", fontSize: 10.5, fontFamily: "var(--font-mono)" }, tickLine: false, axisLine: false, tickMargin: 8 };
  const grid = <CartesianGrid stroke="rgb(var(--ink-rgb) / 0.09)" strokeDasharray="2 4" vertical={false} />;
  const legend = spec.y.length > 1 ? <Legend verticalAlign="top" align="right" iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingBottom: 8, color: "var(--fg-dim)" }} /> : null;
  const tip = <Tooltip content={<Tip />} cursor={{ stroke: "rgb(var(--ink-rgb) / 0.2)", strokeDasharray: "3 3", fill: "rgb(var(--ink-rgb) / 0.04)" }} />;
  const margin = { top: 10, right: 12, bottom: 2, left: -6 };
  const anim = { animationDuration: 900, animationEasing: "ease-out" as const };
  const grads = (
    <defs>
      {SERIES.map((c, i) => (
        <linearGradient key={i} id={`${gid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.9} />
          <stop offset="100%" stopColor={c} stopOpacity={0.55} />
        </linearGradient>
      ))}
      {SERIES.map((c, i) => (
        <linearGradient key={`a${i}`} id={`${gid}-a${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity={0.28} />
          <stop offset="100%" stopColor={c} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
  const total = spec.kind === "pie" ? rows.reduce((s, r) => s + (Number(r[spec.y[0]]) || 0), 0) : 0;

  return (
    <div className="chart" style={{ width: "100%", height }} role="img" aria-label={`${spec.kind} chart of ${spec.y.join(", ")} by ${spec.x}`}>
      <ResponsiveContainer>
        {spec.kind === "pie" ? (
          <PieChart>
            {tip}
            <Legend verticalAlign="bottom" iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "var(--fg-dim)" }} />
            <Pie data={rows} dataKey={spec.y[0]} nameKey={spec.x} innerRadius="58%" outerRadius="82%" paddingAngle={2} cornerRadius={4} stroke="var(--card)" strokeWidth={2} {...anim}>
              {rows.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
              <Label position="center" content={({ viewBox }) => {
                const vb = viewBox as { cx?: number; cy?: number };
                return (
                  <g>
                    <text x={vb.cx} y={(vb.cy ?? 0) - 4} textAnchor="middle" className="chart-total">{fmt(total)}</text>
                    <text x={vb.cx} y={(vb.cy ?? 0) + 14} textAnchor="middle" className="chart-total-k">{spec.y[0]}</text>
                  </g>
                );
              }} />
            </Pie>
          </PieChart>
        ) : spec.kind === "area" ? (
          <AreaChart data={rows} margin={margin}>
            {grads}{grid}
            <XAxis dataKey={spec.x} {...axis} />
            <YAxis {...axis} tickFormatter={fmt} width={46} />
            {tip}{legend}
            {spec.y.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={SERIES[i % SERIES.length]} fill={`url(#${gid}-a${i % SERIES.length})`} strokeWidth={2} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} {...anim} />)}
          </AreaChart>
        ) : spec.kind === "bar" ? (
          <BarChart data={rows} margin={margin} barCategoryGap="28%" barGap={3}>
            {grads}{grid}
            <XAxis dataKey={spec.x} {...axis} />
            <YAxis {...axis} tickFormatter={fmt} width={46} />
            {tip}{legend}
            {spec.y.map((k, i) => <Bar key={k} dataKey={k} fill={`url(#${gid}-g${i % SERIES.length})`} radius={[5, 5, 1, 1]} maxBarSize={34} {...anim} />)}
          </BarChart>
        ) : spec.kind === "scatter" ? (
          <ScatterChart margin={margin}>
            <CartesianGrid stroke="rgb(var(--ink-rgb) / 0.09)" strokeDasharray="2 4" />
            <XAxis dataKey={spec.x} type="number" name={spec.x} {...axis} tickFormatter={fmt} />
            <YAxis dataKey={spec.y[0]} type="number" name={spec.y[0]} {...axis} tickFormatter={fmt} width={46} />
            {tip}
            <Scatter data={rows} fill={SERIES[0]} fillOpacity={0.75} {...anim} />
          </ScatterChart>
        ) : (
          <LineChart data={rows} margin={margin}>
            {grads}{grid}
            <XAxis dataKey={spec.x} {...axis} type={typeof rows[0]?.[spec.x] === "number" ? "number" : "category"} domain={["dataMin", "dataMax"]} />
            <YAxis {...axis} domain={["auto", "auto"]} tickFormatter={fmt} width={46} />
            {tip}{legend}
            {spec.y.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={SERIES[i % SERIES.length]} strokeWidth={2.2} dot={false} activeDot={{ r: 4.5, strokeWidth: 2, stroke: "var(--card)" }} {...anim} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
