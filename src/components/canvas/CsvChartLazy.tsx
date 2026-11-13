"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CsvChart as Chart } from "./CsvChart";

// 차트는 브라우저에서만 그림 (recharts 를 서버 번들에서 빼서 Cloudflare 용량 절약)
const Lazy = dynamic(() => import("./CsvChart").then((m) => m.CsvChart), {
  ssr: false,
  loading: () => <div className="chart-loading" aria-hidden="true" />,
});

export function CsvChart(props: ComponentProps<typeof Chart>) {
  return <Lazy {...props} />;
}
