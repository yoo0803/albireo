import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JOIN_TTL, pendingRequest, viewerIsAdmin } from "@/lib/join";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = { title: "Membership request", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// 가입 신청 검토: 관리자 로그인 필요
export default async function JoinReview({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token = "" } = await searchParams;
  if (!(await viewerIsAdmin())) redirect(`/login?next=${encodeURIComponent(`/join/review?t=${token}`)}`);
  const req = await pendingRequest(token);
  const expired = !!req && req.status === "pending" && Date.now() - Date.parse(req.created_at) > JOIN_TTL;
  const state = !req ? "없는 신청입니다." : req.status === "approved" ? "이미 승인된 신청입니다." : req.status === "declined" ? "이미 거절된 신청입니다." : expired ? "만료된 신청입니다. (7일)" : null;

  return (
    <section className="wrap login">
      <div className="login-card join-review">
        <span className="tape" aria-hidden="true" />
        <p className="label faint">Admin</p>
        <h1 className="display login-title">Member <em>request</em></h1>
        {req && (
          <dl className="join-info">
            <dt>이름</dt><dd>{req.name}</dd>
            <dt>메일</dt><dd>{req.email}</dd>
            {req.field && (<><dt>분야</dt><dd>{req.field}</dd></>)}
            {req.note && (<><dt>메모</dt><dd className="join-note">{req.note}</dd></>)}
            <dt>신청</dt><dd>{new Date(req.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</dd>
          </dl>
        )}
        {state ? <p className="dim">{state}</p> : <ReviewForm token={token} />}
      </div>
    </section>
  );
}
