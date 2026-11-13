"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEpisode, createSeries, deleteSeries, updateSeries, type SeriesInput } from "@/app/studio/actions";
import { ConfirmButton } from "@/components/studio/ConfirmAction";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { CADENCE, KIND, STATUS, episodeLabel, pick } from "@/content/series";
import { useLang, useT } from "@/lib/i18n/client";
import type { Series, SeriesCadence, SeriesKind, SeriesStatus } from "@/types/database";

export type DeskEpisode = { id: string; title: string; no: number | null; state: "live" | "review" | "draft"; author: string };
export type DeskSeries = Series & { owner: string; mine: boolean; episodes: DeskEpisode[] };

const kinds = Object.keys(KIND) as SeriesKind[];
const cadences = Object.keys(CADENCE) as SeriesCadence[];
const statuses = Object.keys(STATUS) as SeriesStatus[];

// 작업실 연재 작업대: 시리즈 = 책등, 회차 = 칸
export function SeriesDesk({ list }: { list: DeskSeries[] }) {
  const t = useT();
  const en = useLang() === "en";
  const router = useRouter();
  const [open, setOpen] = useState(list.length === 0);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="stack" style={{ ["--gap" as string]: "18px" }}>
      <div className="desk-new">
        <button type="button" className="btn btn-sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t("닫기", "Close") : t("+ 새 연재", "+ New series")}
        </button>
        {msg && <span className="mono dim" role="status">{msg}</span>}
      </div>
      {open && (
        <form
          className="panel panel-body stack desk-form"
          action={async (form) => {
            const r = await createSeries(form);
            if (!r.ok) { setMsg(r.error); return; }
            setMsg(t("새 연재를 만들었습니다.", "Series created."));
            setOpen(false);
            router.refresh();
          }}
        >
          <SeriesFields />
          <div><SubmitButton pending="…">{t("연재 만들기", "Create series")}</SubmitButton></div>
        </form>
      )}

      {list.length === 0 && <p className="dim">{t("아직 연재가 없습니다. 첫 연재를 만들어 회차를 이어 붙여 보세요.", "No series yet. Start one and line up its episodes.")}</p>}

      <div className="desk">
        {list.map((s) => <DeskRow key={s.id} s={s} en={en} />)}
      </div>
    </div>
  );
}

function DeskRow({ s, en }: { s: DeskSeries; en: boolean }) {
  const t = useT();
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const live = s.episodes.filter((e) => e.state === "live").length;

  const setStatus = (status: SeriesStatus) =>
    start(async () => {
      const r = await updateSeries(s.id, { ...s, status });
      setErr(r.ok ? null : r.error);
      router.refresh();
    });

  return (
    <section className="desk-row" data-kind={s.kind}>
      <div className="desk-spine" aria-hidden="true"><span>{pick(KIND[s.kind], en)}</span></div>
      <div className="desk-main">
        <div className="desk-top">
          <div className="desk-title-wrap">
            <h2 className="desk-title">{s.title}</h2>
            <span className="mono faint">
              {pick(CADENCE[s.cadence], en)} / {s.owner} / {t(`공개 ${live} / 전체 ${s.episodes.length}`, `${live} live / ${s.episodes.length} total`)}
            </span>
          </div>
          <div className="desk-actions">
            {s.mine ? (
              <select className="select desk-status" value={s.status} disabled={busy} onChange={(e) => setStatus(e.target.value as SeriesStatus)} aria-label={t("연재 상태", "Series status")}>
                {statuses.map((x) => <option key={x} value={x}>{pick(STATUS[x], en)}</option>)}
              </select>
            ) : (
              <span className="chip" data-status={s.status}>{pick(STATUS[s.status], en)}</span>
            )}
            {live > 0 && <Link href={`/series/${s.slug}`} className="btn btn-sm btn-ghost">{t("웹진에서 보기", "View live")} ↗</Link>}
            {s.mine && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit((v) => !v)}>{edit ? t("닫기", "Close") : t("편집", "Edit")}</button>}
          </div>
        </div>
        {s.blurb && !edit && <p className="desk-blurb">{s.blurb}</p>}

        {edit && (
          <form
            className="stack desk-form"
            action={async (form) => {
              const r = await updateSeries(s.id, Object.fromEntries(form) as Partial<SeriesInput>);
              if (!r.ok) { setErr(r.error); return; }
              setErr(null);
              setEdit(false);
              router.refresh();
            }}
          >
            <SeriesFields s={s} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SubmitButton pending="…">{t("저장", "Save")}</SubmitButton>
              <ConfirmButton
                label={t("연재 삭제", "Delete series")}
                className="btn btn-sm btn-ghost bulk-danger"
                ask={t("이 연재를 삭제하시겠습니까?", "Delete this series?")}
                sub={t("회차 원고는 지워지지 않고 연재 표시만 빠집니다.", "Episodes stay; they just leave the series.")}
                ok={t("삭제", "Delete")}
                onConfirm={async () => { const r = await deleteSeries(s.id); if (r.ok) router.refresh(); return r; }}
              />
            </div>
          </form>
        )}

        <ol className="desk-rail" aria-label={t("회차", "Episodes")}>
          {s.episodes.map((e) => (
            <li key={e.id}>
              <Link href={`/studio/articles/${e.id}`} className="desk-ep" data-state={e.state} title={`${e.title} · ${e.author}`}>
                <span className="desk-ep-no">{e.no ?? "—"}</span>
                <span className="desk-ep-title">{e.title}</span>
                <span className="desk-ep-state mono">{e.state === "live" ? t("공개", "Live") : e.state === "review" ? t("검수", "Review") : t("초안", "Draft")}</span>
              </Link>
            </li>
          ))}
          <li>
            <form action={createEpisode} className="desk-ep-new">
              <input type="hidden" name="series_id" value={s.id} />
              <SubmitButton className="desk-ep desk-ep-add" pending="…">
                <span className="desk-ep-no">+</span>
                <span className="desk-ep-title">{t(`${episodeLabel(s.kind, nextNo(s), false)} 원고 쓰기`, `Write ${episodeLabel(s.kind, nextNo(s), true)}`)}</span>
              </SubmitButton>
            </form>
          </li>
        </ol>
        {err && <p className="mono dim" role="alert">{err}</p>}
      </div>
    </section>
  );
}

const nextNo = (s: DeskSeries) => Math.max(0, ...s.episodes.map((e) => e.no ?? 0)) + 1;

// 만들기 · 편집 공용 입력
function SeriesFields({ s }: { s?: DeskSeries }) {
  const t = useT();
  const en = useLang() === "en";
  const [kind, setKind] = useState<SeriesKind>(s?.kind ?? "serial");
  const uid = s?.id ?? "new";
  return (
    <>
      <div className="field"><label htmlFor={`st-${uid}`}>{t("제목", "Title")}</label><input id={`st-${uid}`} name="title" className="input" required maxLength={80} defaultValue={s?.title} /></div>
      <div className="desk-kind" role="radiogroup" aria-label={t("형식", "Format")}>
        {kinds.map((k) => (
          <label key={k} className="chip" data-on={kind === k || undefined}>
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            {pick(KIND[k], en)}
            <span className="faint">{k === "serial" ? t("이어지는 이야기 (n화)", "Continuing story (Ep. n)") : t("호 단위 발행 (제n호)", "Issues (No. n)")}</span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label htmlFor={`sc-${uid}`}>{t("발행 주기", "Cadence")}</label>
          <select id={`sc-${uid}`} name="cadence" className="select" defaultValue={s?.cadence ?? "irregular"}>
            {cadences.map((c) => <option key={c} value={c}>{pick(CADENCE[c], en)}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: "1 1 160px" }}>
          <label htmlFor={`ss-${uid}`}>{t("상태", "Status")}</label>
          <select id={`ss-${uid}`} name="status" className="select" defaultValue={s?.status ?? "ongoing"}>
            {statuses.map((x) => <option key={x} value={x}>{pick(STATUS[x], en)}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor={`sb-${uid}`}>{t("소개 (웹진 서가에 표시)", "Blurb (shown on the shelf)")}</label><textarea id={`sb-${uid}`} name="blurb" className="textarea" style={{ minHeight: 70 }} maxLength={280} defaultValue={s?.blurb ?? ""} /></div>
      <details className="desk-en">
        <summary className="mono dim">{t("영문 (선택)", "English (optional)")}</summary>
        <div className="stack" style={{ ["--gap" as string]: "10px", marginTop: 10 }}>
          <input name="title_en" className="input" maxLength={80} placeholder="English title" defaultValue={s?.title_en ?? ""} lang="en" aria-label="English title" />
          <textarea name="blurb_en" className="textarea" style={{ minHeight: 60 }} maxLength={280} placeholder="English blurb" defaultValue={s?.blurb_en ?? ""} lang="en" aria-label="English blurb" />
        </div>
      </details>
    </>
  );
}
