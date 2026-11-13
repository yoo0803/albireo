import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/env";
import { mailReady } from "@/lib/mail";
import { listPublicArticles } from "@/lib/data/public";
import { StudioHead } from "@/components/studio/StudioHead";
import { DailyBars } from "@/components/studio/DailyBars";
import { getLang, getT } from "@/lib/i18n/server";
import type { SiteStats } from "@/types/database";

export const dynamic = "force-dynamic";
const RANGES = [7, 30, 90] as const;

// 국가 코드 → 이름
const country = (code: string, lang: string) => {
  if (code === "??") return "—";
  try { return new Intl.DisplayNames([lang === "en" ? "en" : "ko"], { type: "region" }).of(code) ?? code; } catch { return code; }
};

function Tally({ title, rows, label }: { title: string; rows: { k: string; n: number }[]; label?: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="tally">
      <h3 className="label faint">{title}</h3>
      {rows.length === 0 ? <p className="faint" style={{ fontSize: "0.85rem" }}>—</p> : (
        <ol>
          {rows.map((r) => (
            <li key={r.k}>
              <span className="tally-bar" style={{ width: `${(r.n / max) * 100}%` }} aria-hidden="true" />
              <span className="tally-k">{label ? label(r.k) : r.k}</span>
              <span className="tally-n">{r.n}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// 사이트 통계 (관리자 전용)
export default async function Analytics({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const t = await getT();
  const lang = await getLang();
  const { profile } = await getViewer();
  if (!profile?.is_member || !isAdmin(profile)) redirect("/studio");
  const d = Number((await searchParams).d);
  const days = (RANGES as readonly number[]).includes(d) ? d : 30;
  const db = supabaseAdmin();

  if (!db) {
    return (
      <div className="stack" style={{ ["--gap" as string]: "18px" }}>
        <StudioHead title={t("통계", "Analytics")} note={t("방문자 · 유입 경로 · 구독자", "Visitors · referrers · subscribers")} />
        <p className="dim">{t("Cloudflare 워커 환경 변수에 SUPABASE_SERVICE_ROLE_KEY 를 추가하면 통계가 켜져요.", "Add SUPABASE_SERVICE_ROLE_KEY to the Cloudflare Worker variables to turn analytics on.")}</p>
      </div>
    );
  }

  const [{ data, error }, top] = await Promise.all([db.rpc("site_stats", { days }), listPublicArticles({ limit: 120 })]);
  const s = (data ?? null) as SiteStats | null;
  const best = [...top].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 8);
  const device = { mobile: t("모바일", "Mobile"), tablet: t("태블릿", "Tablet"), desktop: t("데스크톱", "Desktop") } as Record<string, string>;
  const ref = (k: string) => (k === "direct" ? t("직접 · 북마크", "Direct · bookmark") : k);

  const kpi = [
    [t("오늘 방문자", "Visitors today"), s?.today_visitors ?? 0],
    [t(`${days}일 방문자`, `Visitors · ${days}d`), s?.visitors ?? 0],
    [t(`${days}일 페이지뷰`, `Page views · ${days}d`), s?.views ?? 0],
    [t("구독자", "Subscribers"), s?.subscribers ?? 0],
  ] as const;

  return (
    <div className="stack analytics" style={{ ["--gap" as string]: "28px" }}>
      <StudioHead title={t("통계", "Analytics")} note={t("방문자 · 유입 경로 · 구독자. 쿠키 없이 익명 집계 (작업실 방문 제외)", "Visitors · referrers · subscribers. Anonymous, cookie-free (studio excluded)")} />
      <div className="range" role="group" aria-label={t("기간", "Range")}>
        {RANGES.map((r) => <Link key={r} href={`/studio/analytics?d=${r}`} aria-current={r === days ? "true" : undefined}>{r}{t("일", "d")}</Link>)}
      </div>
      {error && <p className="err">{t("통계를 불러오지 못했어요. Supabase에 마이그레이션 012가 적용됐는지 확인해 주세요.", "Couldn’t load stats. Check that migration 012 is applied in Supabase.")}</p>}

      <div className="kpis">
        {kpi.map(([k, v]) => <div key={k} className="kpi"><span className="label faint">{k}</span><strong>{v.toLocaleString()}</strong></div>)}
      </div>

      <section>
        <h3 className="label faint" style={{ marginBottom: 10 }}>{t("일별 방문자", "Daily visitors")}</h3>
        <DailyBars data={s?.daily ?? []} days={days} />
      </section>

      <div className="tallies">
        <Tally title={t("많이 본 페이지 (페이지뷰)", "Top pages (views)")} rows={s?.pages ?? []} />
        <Tally title={t("유입 경로 (방문자)", "Referrers (visitors)")} rows={s?.refs ?? []} label={ref} />
        <Tally title={t("국가 (방문자)", "Countries (visitors)")} rows={s?.countries ?? []} label={(k) => country(k, lang)} />
        <Tally title={t("기기 (방문자)", "Devices (visitors)")} rows={s?.devices ?? []} label={(k) => device[k] ?? k} />
        <Tally title={t("글 조회수 (누적)", "Article views (all time)")} rows={best.map((a) => ({ k: lang === "en" && a.title_en ? a.title_en : a.title, n: a.view_count ?? 0 }))} />
      </div>

      {!mailReady() && (
        <p className="faint" style={{ fontSize: "0.85rem" }}>{t("구독 메일 발송은 SMTP_USER · SMTP_PASS 환경 변수를 넣으면 켜져요.", "Subscription emails turn on once SMTP_USER and SMTP_PASS are set.")}</p>
      )}
    </div>
  );
}
