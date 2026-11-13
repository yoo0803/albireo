"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purgeItem, restoreItem, trashItem, type TrashKind } from "@/app/studio/actions";
import { useT } from "@/lib/i18n/client";
import type { T } from "@/lib/i18n";

type Outcome = { ok: true } | { ok: false; error: string } | void;

type ButtonProps = {
  label: string;
  ask?: string; // 없으면 확인 없이 실행
  sub?: string;
  ok?: string;
  className?: string;
  onConfirm: () => Promise<Outcome>;
};

// 확인창 버튼
export function ConfirmButton({ label, ask, sub, ok, className = "btn btn-sm btn-ghost", onConfirm }: ButtonProps) {
  const t = useT();
  const dlg = useRef<HTMLDialogElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const run = () =>
    start(async () => {
      const r = await onConfirm();
      if (r && !r.ok) { setErr(r.error); return; }
      dlg.current?.close();
    });

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setErr(null);
          if (ask) dlg.current?.showModal();
          else run();
        }}
      >
        {label}
      </button>
      {ask && (
        <dialog ref={dlg} className="confirm" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
          <p className="confirm-ask">{ask}</p>
          {sub && <p className="confirm-sub">{sub}</p>}
          {err && <p className="error-text">{err}</p>}
          <div className="confirm-row">
            <button type="button" className="btn btn-sm" onClick={() => dlg.current?.close()} autoFocus>{t("취소", "Cancel")}</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={run} disabled={busy}>{busy ? "…" : (ok ?? t("확인", "OK"))}</button>
          </div>
        </dialog>
      )}
    </>
  );
}

type Mode = "trash" | "restore" | "purge";

const COPY = (t: T): Record<Mode, Omit<ButtonProps, "onConfirm" | "className">> => ({
  trash: { label: t("삭제", "Delete"), ask: t("삭제하시겠습니까?", "Delete this?"), sub: t("휴지통으로 이동", "Moves to Trash"), ok: t("삭제", "Delete") },
  restore: { label: t("복원", "Restore") },
  purge: { label: t("영구 삭제", "Delete forever"), ask: t("영구 삭제하시겠습니까?", "Delete permanently?"), sub: t("복구 불가", "This cannot be undone"), ok: t("영구 삭제", "Delete forever") },
});

const RUN = { trash: trashItem, restore: restoreItem, purge: purgeItem };

// 휴지통 이동 · 복원 · 영구 삭제
export function ConfirmAction({ kind, id, mode = "trash", redirectTo, className }: { kind: TrashKind; id: string; mode?: Mode; redirectTo?: string; className?: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <ConfirmButton
      {...COPY(t)[mode]}
      className={className}
      onConfirm={async () => {
        const r = await RUN[mode](kind, id);
        if (r.ok) { if (redirectTo) router.push(redirectTo); else router.refresh(); }
        return r;
      }}
    />
  );
}
