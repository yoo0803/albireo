import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { DisciplineChip } from "@/components/article/DisciplineChip";
import { createArticle } from "./actions";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { getLang, getT } from "@/lib/i18n/server";
import { STATUS_LABEL } from "@/content/status";

// 대시보드: 내 원고 · 검수 대기 · 캔버스
export default async function StudioHome() {
  const t = await getT();
  const ko = (await getLang()) === "ko";
  const { sb, profile } = await getViewer();
  const uid = profile!.id;

  const [{ data: mine }, { data: inReview }, { data: myReviews }, { count: canvases }, { data: recentAnn }] = await Promise.all([
    sb.from("articles").select("id, title, status, is_public, peer_reviewed, discipline, updated_at").is("deleted_at", null).eq("author_id", uid).order("updated_at", { ascending: false }).limit(8),
    sb.from("articles").select("id, title, discipline, author_id, updated_at").is("deleted_at", null).eq("status", "in_review").neq("author_id", uid).limit(20),
    sb.from("peer_reviews").select("article_id").eq("reviewer_id", uid),
    sb.from("canvases").select("id", { count: "exact", head: true }).is("deleted_at", null),
    sb.from("annotations").select("id, quote, article_id, created_at").order("created_at", { ascending: false }).limit(6),
  ]);

  const reviewed = new Set((myReviews ?? []).map((r) => r.article_id));
  const queue = (inReview ?? []).filter((a) => !reviewed.has(a.id));

  return (
    <div className="stack" style={{ ["--gap" as string]: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="studio-title" style={{ margin: 0 }}>{t("개요", "Overview")}</h1>
          <p className="studio-note">{t("내 원고, 검수 대기, 최근 주석 현황", "My manuscripts, review queue and recent notes")}</p>
        </div>
        <form action={createArticle}>
          <input type="hidden" name="title" value={t("제목 없음", "Untitled")} />
          <SubmitButton pending={t("만드는 중…", "Creating…")}>{t("새 원고", "New manuscript")}</SubmitButton>
        </form>
      </div>

      <div className="stat-row" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <div><strong>{mine?.length ?? 0}</strong><span className="mono faint">{t("내 원고", "My manuscripts")}</span></div>
        <div><strong>{queue.length}</strong><span className="mono faint">{t("내 검수 대기", "Awaiting my review")}</span></div>
        <div><Link href="/studio/canvas"><strong>{canvases ?? 0}</strong></Link><span className="mono faint">{t("캔버스", "Canvases")}</span></div>
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-head"><span className="mono">{t("내 원고", "My manuscripts")}</span><Link href="/studio/articles" className="mono dim">{t("전체 →", "All →")}</Link></div>
          <p className="panel-note">{t("내가 쓴 최근 원고", "My recent manuscripts")}</p>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>{t("제목", "Title")}</th><th>{t("분야", "Field")}</th><th>{t("상태", "Status")}</th></tr></thead>
              <tbody>
                {(mine ?? []).map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/studio/articles/${a.id}`} className="serif">{a.title}</Link></td>
                    <td><DisciplineChip d={a.discipline} ko={ko} /></td>
                    <td className="mono dim">{a.is_public ? t("공개", "public") : t(...STATUS_LABEL[a.status])}{a.peer_reviewed ? " ◉" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><span className="mono">{t("검수 대기", "Review queue")}</span></div>
          <p className="panel-note">{t("내 검수가 필요한 원고", "Waiting for my review")}</p>
          <div className="panel-body stack">
            {queue.length ? queue.map((a) => (
              <Link key={a.id} href={`/studio/articles/${a.id}?tab=review`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span className="serif">{a.title}</span><DisciplineChip d={a.discipline} ko={ko} />
              </Link>
            )) : <p className="dim">{t("검수 대기 없음", "Nothing to review")}</p>}
          </div>
          <div className="panel-head" style={{ borderTop: "1px solid var(--line)" }}><span className="mono">{t("최근 주석", "Recent highlights")}</span></div>
          <p className="panel-note">{t("최근 문장 주석", "Recent sentence notes")}</p>
          <div className="panel-body stack">
            {(recentAnn ?? []).map((a) => (
              <Link key={a.id} href={`/studio/articles/${a.article_id}?tab=read`} className="dim" style={{ fontSize: "0.9rem" }}>“{a.quote}”</Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
