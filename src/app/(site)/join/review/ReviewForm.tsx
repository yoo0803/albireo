"use client";
import { useActionState } from "react";
import { decide, type ReviewState } from "../actions";

// 승인 · 거절 버튼
export function ReviewForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState<ReviewState, FormData>(decide, null);
  if (s?.ok) return <p className="join-done">{s.msg}</p>;
  return (
    <form action={action} className="join-actions">
      <input type="hidden" name="t" value={token} />
      <button className="btn btn-gold" name="verdict" value="approve" disabled={pending}>{pending ? "처리 중…" : "승인"}</button>
      <button className="btn join-decline" name="verdict" value="decline" disabled={pending}>거절</button>
      {s && !s.ok && <p className="error-text">{s.msg}</p>}
    </form>
  );
}
