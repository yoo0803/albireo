"use client";
import { createContext, useContext, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkItems, type TrashKind } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";

// 목록 여러 개 선택: 전체 선택 · 휴지통 · 복원 · 영구 삭제
type Key = `${TrashKind}:${string}`;
type Ctx = { sel: Set<Key>; toggle: (k: Key) => void };
const C = createContext<Ctx | null>(null);
type Mode = "trash" | "restore" | "purge";

export function BulkScope({ keys, actions, children }: { keys: Key[]; actions: Mode[]; children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const [sel, setSel] = useState<Set<Key>>(new Set());
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [ask, setAsk] = useState<Mode | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const live = useMemo(() => new Set([...sel].filter((k) => keys.includes(k))), [sel, keys]);
  const all = keys.length > 0 && live.size === keys.length;
  const ctx = useMemo<Ctx>(() => ({ sel: live, toggle: (k) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; }) }), [live]);

  const run = (mode: Mode) => start(async () => {
    const items = [...live].map((k) => { const [kind, id] = k.split(":") as [TrashKind, string]; return { kind, id }; });
    const r = await bulkItems(mode, items);
    dlg.current?.close();
    setSel(new Set());
    setMsg(r.failed ? t(`${r.ok}개 처리 · ${r.failed}개는 권한이 없어 건너뛰었습니다.`, `${r.ok} done · ${r.failed} skipped (not yours)`) : t(`${r.ok}개 처리했습니다.`, `${r.ok} done.`));
    setTimeout(() => setMsg(null), 3200);
    router.refresh();
  });
  const label: Record<Mode, string> = { trash: t("삭제", "Delete"), restore: t("복원", "Restore"), purge: t("영구 삭제", "Delete forever") };
  const confirmText: Record<Mode, string> = {
    trash: t(`${live.size}개를 휴지통으로 옮기시겠습니까?`, `Move ${live.size} to Trash?`),
    restore: "",
    purge: t(`${live.size}개를 영구 삭제하시겠습니까? 되돌릴 수 없습니다.`, `Delete ${live.size} permanently? This cannot be undone.`),
  };

  return (
    <C.Provider value={ctx}>
      {keys.length > 0 && (
        <div className={`bulk-bar${live.size ? " on" : ""}`}>
          <label className="bulk-all">
            <input type="checkbox" checked={all} ref={(el) => { if (el) el.indeterminate = live.size > 0 && !all; }} onChange={() => setSel(all ? new Set() : new Set(keys))} />
            {live.size ? t(`${live.size}개 선택`, `${live.size} selected`) : t("전체 선택", "Select all")}
          </label>
          {live.size > 0 && actions.map((m) => (
            <button key={m} type="button" className={`btn btn-sm${m === "restore" ? "" : " btn-ghost bulk-danger"}`} disabled={busy}
              onClick={() => { if (m === "restore") run(m); else { setAsk(m); dlg.current?.showModal(); } }}>
              {label[m]}
            </button>
          ))}
          {live.size > 0 && <button type="button" className="bulk-clear" onClick={() => setSel(new Set())}>{t("선택 해제", "Clear")}</button>}
          {msg && <span className="bulk-msg" role="status">{msg}</span>}
        </div>
      )}
      {children}
      <dialog ref={dlg} className="confirm" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <p className="confirm-ask">{ask ? confirmText[ask] : ""}</p>
        <div className="confirm-row">
          <button type="button" className="btn btn-sm" onClick={() => dlg.current?.close()} autoFocus>{t("취소", "Cancel")}</button>
          <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => ask && run(ask)}>{busy ? "…" : ask ? label[ask] : ""}</button>
        </div>
      </dialog>
    </C.Provider>
  );
}

// 행 · 카드 체크 상자
export function BulkCheck({ k, label }: { k: Key; label: string }) {
  const ctx = useContext(C);
  if (!ctx) return null;
  return <input type="checkbox" className="bulk-check" aria-label={label} checked={ctx.sel.has(k)} onChange={() => ctx.toggle(k)} onClick={(e) => e.stopPropagation()} />;
}
