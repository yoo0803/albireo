"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { CsvChart } from "./CsvChartLazy";
import { Board } from "./board/Board";
import { EMPTY_DOC, toDoc, uid, type CanvasDoc } from "./types";
import { saveCanvas, setCanvasLock } from "@/app/studio/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import { useT } from "@/lib/i18n/client";

const TABS = ["board", "charts", "moodboard"] as const;
type Tab = (typeof TABS)[number];
const CSV_MAX = 200_000; // jsonb 상한 보호

type Props = { canvasId: string | null; initialTitle: string; initialDoc: Json | null; userId?: string; articles?: { id: string; title: string }[]; locked?: boolean; isOwner?: boolean };

// 인터랙티브 지식 캔버스
export function Workbench({ canvasId, initialTitle, initialDoc, userId, articles, locked: initialLocked = false, isOwner = false }: Props) {
  const t = useT();
  const [title, setTitle] = useState(initialTitle);
  const [doc, setDoc] = useState<CanvasDoc>(initialDoc ? toDoc(initialDoc) : EMPTY_DOC);
  const [tab, setTab] = useState<Tab>("board");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const first = useRef(true);
  const [locked, setLocked] = useState(initialLocked);
  const [lockBusy, setLockBusy] = useState(false);
  const toggleLock = async () => {
    if (!canvasId) return;
    setLockBusy(true);
    const r = await setCanvasLock(canvasId, !locked);
    if (r.ok) setLocked(!locked);
    setLockBusy(false);
  };

  const patch = useCallback((p: Partial<CanvasDoc>) => setDoc((d) => ({ ...d, ...p })), []);

  // 자동 저장 (1.5s 디바운스)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!canvasId) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      const r = await saveCanvas(canvasId, title, doc as unknown as Json);
      setStatus(r.ok ? "saved" : "error");
    }, 1500);
    return () => clearTimeout(t);
  }, [doc, title, canvasId]);

  return (
    <div className="stack" style={{ ["--gap" as string]: "18px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input serif" style={{ fontSize: "1.4rem", fontWeight: 700, flex: "1 1 280px" }} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Canvas title" />
        {canvasId && isOwner && (
          <button type="button" className={`wb-lock${locked ? " on" : ""}`} onClick={toggleLock} disabled={lockBusy} aria-pressed={locked}
            title={locked ? t("잠김: 나만 보고 고칠 수 있습니다. 누르면 멤버와 함께 씁니다.", "Locked: only you can see and edit. Click to share with members.") : t("함께 쓰는 중: 누르면 나만 보도록 잠급니다.", "Shared with members. Click to keep it to yourself.")}>
            {locked ? "🔒" : "🔓"} {locked ? t("잠김 (나만)", "Private") : t("함께 쓰기", "Shared")}
          </button>
        )}
        <span className="mono dim">{canvasId ? status : "local only"}</span>
      </div>
      <div className="wb-tabs" role="tablist">
        {TABS.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {k === "board" ? t("보드", "Board") : k === "charts" ? t("차트", "Charts") : t("무드보드", "Moodboard")}
            <span>{k === "board" ? doc.board.items.length : doc[k].length}</span>
          </button>
        ))}
      </div>
      {tab === "board" && <Board value={doc.board} onChange={(board) => patch({ board })} canvasId={canvasId} userId={userId} articles={articles} />}
      {tab === "charts" && <Charts doc={doc} patch={patch} />}
      {tab === "moodboard" && <Moodboard doc={doc} patch={patch} canvasId={canvasId} userId={userId} />}
    </div>
  );
}

// ─── 차트: CSV 업로드 → 자동 시각화
function Charts({ doc, patch }: { doc: CanvasDoc; patch: (p: Partial<CanvasDoc>) => void }) {
  const t = useT();
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (f: File) => {
    setErr(null);
    if (f.size > CSV_MAX) return setErr(t(`CSV 최대 ${CSV_MAX / 1000}KB`, `CSV up to ${CSV_MAX / 1000}KB`));
    const text = await f.text();
    const parsed = Papa.parse<Record<string, unknown>>(text.trim(), { header: true, skipEmptyLines: true });
    if (parsed.errors.length && !parsed.data.length) return setErr(parsed.errors[0].message);
    patch({ charts: [...doc.charts, { id: uid(), title: f.name.replace(/\.csv$/i, ""), csv: text }] });
  };

  return (
    <div className="stack" style={{ ["--gap" as string]: "20px" }}>
      <label className="panel panel-body" style={{ display: "grid", placeItems: "center", gap: 8, borderStyle: "dashed", cursor: "pointer", padding: 32 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
        <span className="mono">{t("CSV를 끌어 놓거나 눌러서 선택", "Drop a CSV or click")}</span>
        <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </label>
      {err && <p className="error-text">{err}</p>}
      {doc.charts.map((c) => (
        <section key={c.id} className="panel">
          <div className="panel-head">
            <input className="input" style={{ height: 30, maxWidth: 320 }} value={c.title} onChange={(e) => patch({ charts: doc.charts.map((x) => (x.id === c.id ? { ...x, title: e.target.value } : x)) })} />
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="btn btn-sm btn-ghost" onClick={() => patch({ charts: doc.charts.filter((x) => x.id !== c.id) })} aria-label="Remove chart">×</button>
            </div>
          </div>
          <div className="panel-body"><CsvChart csv={c.csv} /></div>
          {c.note && <p className="panel-body dim" style={{ borderTop: "1px solid var(--line)", fontSize: "0.9rem" }}>{c.note}</p>}
        </section>
      ))}
    </div>
  );
}

// ─── 무드보드: Storage 비공개 버킷
function Moodboard({ doc, patch, canvasId, userId }: { doc: CanvasDoc; patch: (p: Partial<CanvasDoc>) => void; canvasId: string | null; userId?: string }) {
  const t = useT();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const remote = !!canvasId && !!userId;

  // 서명 URL 일괄 발급
  useEffect(() => {
    if (!remote) return;
    const paths = doc.moodboard.map((m) => m.path).filter((p) => !p.startsWith("blob:") && !urls[p]);
    if (!paths.length) return;
    supabaseBrowser().storage.from("moodboard").createSignedUrls(paths, 3600).then(({ data }) => {
      if (data) setUrls((u) => ({ ...u, ...Object.fromEntries(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl]] : []))) }));
    });
  }, [doc.moodboard, remote, urls]);

  const onFiles = async (files: FileList) => {
    setErr(null);
    const added = [];
    for (const f of Array.from(files).slice(0, 12)) {
      if (!f.type.startsWith("image/") || f.size > 5_000_000) { setErr(t("이미지 5MB 이하만", "Images up to 5MB")); continue; }
      if (remote) {
        const path = `${userId}/${canvasId}/${uid()}-${f.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabaseBrowser().storage.from("moodboard").upload(path, f, { contentType: f.type });
        if (error) { setErr(error.message); continue; }
        added.push({ id: uid(), path, caption: f.name });
      } else {
        added.push({ id: uid(), path: URL.createObjectURL(f), caption: f.name });
      }
    }
    patch({ moodboard: [...doc.moodboard, ...added] });
  };

  return (
    <div className="stack" style={{ ["--gap" as string]: "16px" }}>
      <label className="btn" style={{ justifySelf: "start" }}>
        Add images
        <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </label>
      {err && <p className="error-text">{err}</p>}
      <div className="moodboard">
        {doc.moodboard.map((m) => {
          const src = m.path.startsWith("blob:") ? m.path : urls[m.path];
          return (
            <figure key={m.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {src ? <img src={src} alt={m.caption ?? ""} loading="lazy" /> : <div style={{ aspectRatio: "4/3" }} className="mono faint">loading…</div>}
              <figcaption style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{m.caption}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => patch({ moodboard: doc.moodboard.filter((x) => x.id !== m.id) })} aria-label="Remove">×</button>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
