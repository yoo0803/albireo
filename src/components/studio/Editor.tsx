"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveArticle, setPublic, setStatus, type ArticleDraft } from "@/app/studio/actions";
import { extractTerms } from "@/lib/text/wikilink";
import { BodyEditor } from "@/components/studio/BodyEditor";
import { ConfirmButton } from "@/components/studio/ConfirmAction";
import { FieldPicker } from "@/components/studio/FieldPicker";
import { StyleControls } from "@/components/studio/StyleControls";
import { CoverPicker } from "@/components/studio/CoverPicker";
import { cleanStyle } from "@/lib/text/style";
import type { Article, SeriesKind } from "@/types/database";
import { episodeLabel } from "@/content/series";

export type SeriesOption = { id: string; title: string; kind: SeriesKind; next: number };
import { useT } from "@/lib/i18n/client";

export function Editor({ article, required, series = [] }: { article: Article; required: number; series?: SeriesOption[] }) {
  const t = useT();
  const initial: ArticleDraft = {
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    body_md: article.body_md,
    tags: article.tags,
    discipline: article.discipline,
    slug: article.slug,
    cover_url: article.cover_url,
    style: cleanStyle(article.style),
    title_en: article.title_en,
    subtitle_en: article.subtitle_en,
    excerpt_en: article.excerpt_en,
    body_en: article.body_en,
    series_id: article.series_id,
    series_no: article.series_no,
  };
  const [d, setD] = useState<ArticleDraft>(initial);
  const [base, setBase] = useState(JSON.stringify(initial));
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = JSON.stringify(d) !== base;
  const terms = useMemo(() => extractTerms(d.body_md), [d.body_md]);
  const set = <K extends keyof ArticleDraft>(k: K, v: ArticleDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const cur = series.find((x) => x.id === d.series_id);

  const save = () =>
    start(async () => {
      const r = await saveArticle(article.id, d);
      if (r.ok) setBase(JSON.stringify(d));
      setMsg(r.ok ? "Saved" : r.error);
      setTimeout(() => setMsg(null), 2400);
    });

  const publish = () =>
    start(async () => {
      const r = await setPublic(article.id, true);
      setMsg(r.ok ? "Published" : r.error);
      if (r.ok) router.refresh();
    });

  // Ctrl/⌘+S 저장
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // 이탈 경고
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  return (
    <div className="split">
      <div className="stack" style={{ ["--gap" as string]: "16px" }}>
        <div className="lang-tabs" role="group" aria-label={t("원고 언어", "Manuscript language")}>
          <button type="button" className="chip" aria-pressed={lang === "ko"} onClick={() => setLang("ko")}>{t("원문", "Original")}</button>
          <button type="button" className="chip" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English {d.body_en ? "●" : t("(선택)", "(optional)")}</button>
        </div>

        {lang === "ko" ? (
          <>
            <input className="input serif" style={{ fontSize: "1.6rem", fontWeight: 700, padding: "12px 14px" }} value={d.title} onChange={(e) => set("title", e.target.value)} aria-label="Title" />
            <input className="input" value={d.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value || null)} placeholder="Subtitle" aria-label="Subtitle" />
            <BodyEditor key="ko" value={d.body_md} onChange={(v) => set("body_md", v)} style={d.style} lang="ko" />
          </>
        ) : (
          <>
            <p className="panel-note" style={{ padding: 0 }}>{t("영문판: EN 방문자에게 표시 · 비워두면 원문 표시 · 주석 · 검수는 원문 기준", "English version: shown to EN visitors · empty = original · notes and reviews follow the original")}</p>
            <input className="input serif" style={{ fontSize: "1.6rem", fontWeight: 700, padding: "12px 14px" }} value={d.title_en ?? ""} onChange={(e) => set("title_en", e.target.value || null)} placeholder="English title" aria-label="English title" lang="en" />
            <input className="input" value={d.subtitle_en ?? ""} onChange={(e) => set("subtitle_en", e.target.value || null)} placeholder="English subtitle" aria-label="English subtitle" lang="en" />
            <BodyEditor key="en" value={d.body_en ?? ""} onChange={(v) => set("body_en", v || null)} style={d.style} lang="en" label="English body" />
          </>
        )}
      </div>

      <aside className="stack" style={{ ["--gap" as string]: "16px" }}>
        <div className="panel">
          <div className="panel-head">
            <span className="mono">Manuscript</span>
            <span className="mono dim">{article.status}{dirty ? " · unsaved" : ""}</span>
          </div>
          <p className="panel-note">{t("주소 · 분야 · 태그 설정", "Slug · field · tags")}</p>
          <div className="panel-body stack">
            <div className="field">
              <label htmlFor="slug">Slug</label>
              <input id="slug" className="input" value={d.slug} onChange={(e) => set("slug", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="disc">Field</label>
              <FieldPicker id="disc" value={d.discipline} onChange={(v) => set("discipline", v ?? "")} />
            </div>
            <div className="field">
              <label htmlFor="tags">Tags (comma)</label>
              <input id="tags" className="input" value={d.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
            </div>
            <div className="field">
              <label htmlFor="excerpt">Excerpt (SEO)</label>
              <textarea id="excerpt" className="textarea" style={{ minHeight: 80 }} maxLength={200} value={d.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value || null)} />
            </div>
            {d.body_en !== null && (
              <div className="field">
                <label htmlFor="excerpt_en">Excerpt (English)</label>
                <textarea id="excerpt_en" className="textarea" style={{ minHeight: 60 }} maxLength={200} value={d.excerpt_en ?? ""} onChange={(e) => set("excerpt_en", e.target.value || null)} lang="en" />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className={article.is_public ? "btn btn-gold" : "btn"} onClick={save} disabled={pending}>{pending ? "Saving…" : article.is_public ? t("저장 · 웹진에 바로 반영 ⌘S", "Save · update live ⌘S") : t("임시저장 ⌘S", "Save draft ⌘S")}</button>
              {article.status === "draft" && (
                <button className="btn" onClick={() => start(async () => { await saveArticle(article.id, d); await setStatus(article.id, "in_review"); setMsg(t("검수 요청됨", "Review requested")); })}>Request review</button>
              )}
              {!article.is_public && article.peer_reviewed && (
                <button className="btn btn-gold" onClick={publish} disabled={pending || dirty}>Publish</button>
              )}
              {!article.is_public && !article.peer_reviewed && (
                <ConfirmButton
                  label={t("Publish · 검수는 나중에", "Publish · review later")}
                  className="btn"
                  ask={t("검수 전에 발행하시겠습니까?", "Publish before review?")}
                  sub={t("Peer-Reviewed 표시 없이 공개 · 개인 페이지 하이라이트 고정 불가 · 승인 완료 시 자동 인증", "Goes live without the Peer-Reviewed mark · can’t be pinned · certified automatically once approved")}
                  ok={t("발행", "Publish")}
                  onConfirm={async () => {
                    if (dirty) { const s = await saveArticle(article.id, d); if (!s.ok) return s; }
                    const r = await setPublic(article.id, true);
                    if (r.ok) { setMsg(t("Published (검수 대기)", "Published (review pending)")); router.refresh(); }
                    return r;
                  }}
                />
              )}
            </div>
            {article.is_public && (
              <p className="panel-note" style={{ padding: 0 }}>
                {t("발행된 상태 그대로 고칠 수 있습니다. 저장하면 웹진에 바로 반영됩니다.", "Edit while live; saving updates the webzine right away.")}
                {article.peer_reviewed ? t(" 본문을 고치면 검수 인증은 다시 받아야 합니다.", " Editing the body resets the peer-review mark.") : ""}
              </p>
            )}
            {!article.is_public && (
              <p className="panel-note" style={{ padding: 0 }}>
                {article.peer_reviewed
                  ? dirty ? t("임시저장 후 Publish (수정 시 검수 초기화)", "Save first (edits reset reviews)") : t(`검수 ${required}인 승인 완료 · Publish 가능`, `${required} approvals · ready to publish`)
                  : t(`검수 ${required}인 승인 시 Peer-Reviewed 발행 · 또는 먼저 발행`, `Peer-Reviewed at ${required} approvals · or publish now`)}
              </p>
            )}
            {msg && <p className="mono dim">{msg}</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">Series</span>{cur && <span className="mono dim">{episodeLabel(cur.kind, d.series_no, false)}</span>}</div>
          <p className="panel-note">{t("연재 · 정기간행의 회차로 묶기", "Make this an episode of a serial or periodical")}</p>
          <div className="panel-body stack">
            <div className="field">
              <label htmlFor="series">{t("연재", "Series")}</label>
              <select
                id="series"
                className="select"
                value={d.series_id ?? ""}
                onChange={(e) => {
                  const s = series.find((x) => x.id === e.target.value);
                  setD((x) => ({ ...x, series_id: s?.id ?? null, series_no: s ? (s.id === article.series_id ? article.series_no : s.next) : null }));
                }}
              >
                <option value="">{t("— 단독 글", "— Standalone")}</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            {cur && (
              <div className="field">
                <label htmlFor="series-no">{cur.kind === "periodical" ? t("호수", "Issue number") : t("회차", "Episode number")}</label>
                <input id="series-no" className="input" type="number" min={1} max={999} value={d.series_no ?? ""} onChange={(e) => set("series_no", e.target.value ? Number(e.target.value) : null)} style={{ width: "8em" }} />
              </div>
            )}
            {!series.length && <a href="/studio/series" className="mono dim">{t("연재 만들기 →", "Start a series →")}</a>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">Typography</span></div>
          <p className="panel-note">{t("이 원고의 본문 서체 · 웹진에도 적용", "Body typography for this piece · also on the webzine")}</p>
          <div className="panel-body"><StyleControls value={d.style} onChange={(s) => set("style", s)} /></div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">Thumbnail</span></div>
          <p className="panel-note">{t("직접 올리거나 템플릿 선택", "Upload an image or pick a template")}</p>
          <div className="panel-body">
            <CoverPicker
              title={d.title}
              field={d.discipline}
              value={d.style.cover}
              onChange={(c) => set("style", { ...d.style, cover: c })}
              coverUrl={d.cover_url}
              onUpload={(url) => set("cover_url", url)}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="mono">Linked concepts · {terms.length}</span></div>
          <p className="panel-note">{t("[[개념어]] 자동 연결", "[[concepts]] link automatically")}</p>
          <div className="panel-body" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {terms.length ? terms.map((t) => <span key={t} className="chip">{t}</span>) : <span className="dim">{t("[[개념어]] 없음", "No [[concepts]]")}</span>}
          </div>
        </div>
      </aside>
    </div>
  );
}
