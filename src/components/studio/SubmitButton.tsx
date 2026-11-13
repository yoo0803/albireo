"use client";
import { useFormStatus } from "react-dom";

// 서버 액션 제출 버튼: 처리 중 표시
export function SubmitButton({ children, pending = "…", className = "btn btn-gold" }: { children: React.ReactNode; pending?: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button className={className} disabled={busy} aria-busy={busy}>
      {busy ? pending : children}
    </button>
  );
}
