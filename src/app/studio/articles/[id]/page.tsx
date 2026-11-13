import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { Editor } from "@/components/studio/Editor";
import { ConfirmAction } from "@/components/studio/ConfirmAction";
import { AnnotatableArticle } from "@/components/studio/AnnotatableArticle";
import { ReviewPanel } from "@/components/studio/ReviewPanel";
import { PublishPanel } from "@/components/studio/PublishPanel";
import { CoauthorPanel } from "@/components/studio/CoauthorPanel";
import { LiveField } from "@/components/studio/LiveField";
import { getLang, getT } from "@/lib/i18n/server";

const TABS = ["write", "read", "review"] as const;
type Tab = (typeof TABS)[number];
const TAB_NOTE: Record<Tab, [string, string]> = {
  write: ["본문, 각주, DOI 인용 작성", "Body, footnotes and DOI citations"],
  read: ["문장 단위 주석과 답글", "Sentence notes and replies"],
  review: ["체크리스트 기반 동료 검수", "Checklist-based peer review"],
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

// 원고 작업실: 작성 · 주석 · 리뷰 · 공개
export default async function Workspace({ params, searchParams }: Props) {
  const t = await getT();
  const ko = (await getLang()) === "ko";
  const [{ id }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "write";
  const { sb, profile } = await getViewer();

  const { data: article } = await sb.from("articles").select("*").eq("id", id).maybeSingle();
  if (!article || article.deleted_at) notFound();

  const [{ data: members }, { data: settings }, { data: anns }, { data: reviews }, { data: coauthors }, { data: seriesRows }, { data: epRows }] = await Promise.all([
    sb.from("profiles").select("id, display_name").eq("is_member", true),
    sb.from("app_settings").select("*").single(),
    sb.from("annotations").select("*").eq("article_id", id).order("created_at"),
    sb.from("peer_reviews").select("*").eq("article_id", id),
    sb.from("article_authors").select("profile_id, contribution").eq("article_id", id),
    sb.from("series").select("id, title, kind").order("updated_at", { ascending: false }),
    sb.from("articles").select("series_id, series_no").not("series_id", "is", null).is("deleted_at", null),
  ]);
  // 연재별 다음 회차 번호
  const seriesOpts = (seriesRows ?? []).map((s) => ({
    ...s,
    next: Math.max(0, ...(epRows ?? []).filter((e) => e.series_id === s.id).map((e) => e.series_no ?? 0)) + 1,
  }));
  const annIds = (anns ?? []).map((a) => a.id);
  const { data: replies } = annIds.length
    ? await sb.from("annotation_replies").select("*").in("annotation_id", annIds).order("created_at")
    : { data: [] };

  const people = Object.fromEntries((members ?? []).map((m) => [m.id, m.display_name]));
  const required = settings?.required_reviews ?? 2;
  // 공저자 · 공개 패널: 작성 탭은 오른쪽 열, 그 외는 아래
  const panels = (
    <>
      <CoauthorPanel articleId={id} authorId={article.author_id} members={members ?? []} initial={coauthors ?? []} />
      <PublishPanel id={id} slug={article.slug} isPublic={article.is_public} reviewed={article.peer_reviewed} required={required} />
    </>
  );

  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/studio/articles" className="mono dim">{t("← 원고 목록", "← Manuscripts")}</Link>
          <LiveField initial={article.discipline} ko={ko} />
          <span className="mono faint">{t(`글: ${people[article.author_id] ?? "—"}`, `by ${people[article.author_id] ?? "—"}`)}</span>
          {article.author_id === profile!.id && <ConfirmAction kind="articles" id={id} redirectTo="/studio/articles" />}
        </div>
        <nav className="tabs" role="tablist" style={{ borderBottom: 0 }}>
          {TABS.map((tl) => (
            <Link key={tl} href={`?tab=${tl}`} role="tab" aria-selected={tab === tl} className="mono" style={{ padding: "8px 12px", borderBottom: tab === tl ? "1px solid var(--gold)" : "1px solid transparent", color: tab === tl ? "var(--fg)" : "var(--fg-dim)" }}>
              {tl === "write" ? t("작성", "Write") : tl === "read" ? `${t("주석", "Annotate")} (${anns?.length ?? 0})` : `${t("검수", "Review")} (${(reviews ?? []).filter((r) => r.verdict === "approve").length}/${required})`}
            </Link>
          ))}
        </nav>
      </div>

      <p className="studio-note">{t(...TAB_NOTE[tab])}</p>

      {tab === "write" && <Editor article={article} required={required} series={seriesOpts} side={panels} />}
      {tab === "read" && (
        <AnnotatableArticle
          articleId={id}
          body={article.body_md}
          me={{ id: profile!.id, name: profile!.display_name }}
          people={people}
          initial={{ annotations: anns ?? [], replies: replies ?? [] }}
        />
      )}
      {tab === "review" && (
        <ReviewPanel articleId={id} meId={profile!.id} required={required} people={people} initial={reviews ?? []} reviewed={article.peer_reviewed} />
      )}

      {tab !== "write" && <div className="studio-side-row">{panels}</div>}
    </div>
  );
}
