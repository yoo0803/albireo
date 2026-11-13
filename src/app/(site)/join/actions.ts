"use server";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { JOIN_TTL, findUserId, pendingRequest, viewerIsAdmin } from "@/lib/join";
import { sendJoinApproved } from "@/lib/mail";

export type ReviewState = { ok: boolean; msg: string } | null;
// 승인 · 거절 (버튼으로만: 메일 미리보기 봇의 자동 열람 방지)
export async function decide(_: ReviewState, form: FormData): Promise<ReviewState> {
  if (!(await viewerIsAdmin())) return { ok: false, msg: "관리자만 처리할 수 있습니다." };
  const token = String(form.get("t") ?? "");
  const verdict = String(form.get("verdict") ?? "");
  const db = supabaseAdmin();
  const req = await pendingRequest(token);
  if (!db || !req) return { ok: false, msg: "신청을 찾을 수 없습니다." };
  if (req.status !== "pending") return { ok: false, msg: req.status === "approved" ? "이미 승인된 신청입니다." : "이미 거절된 신청입니다." };
  if (Date.now() - Date.parse(req.created_at) > JOIN_TTL) return { ok: false, msg: "만료된 신청입니다. (7일)" };

  if (verdict === "decline") {
    await db.from("member_requests").update({ status: "declined", decided_at: new Date().toISOString() }).eq("id", req.id).eq("status", "pending");
    return { ok: true, msg: "거절했습니다. 신청자에게는 메일을 보내지 않습니다." };
  }
  if (verdict !== "approve") return { ok: false, msg: "잘못된 요청입니다." };

  // 정원 미리 확인
  const [{ data: settings }, { count }] = await Promise.all([
    db.from("app_settings").select("max_members").maybeSingle(),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("is_member", true),
  ]);
  const cap = (settings as { max_members?: number } | null)?.max_members ?? 4;
  try {
    let id = await findUserId(db, req.email.toLowerCase());
    const fresh = !id;
    if (!id) {
      // 계정 생성 (비밀번호 없음 · 로그인 링크로 첫 로그인)
      const { data, error } = await db.auth.admin.createUser({ email: req.email, email_confirm: true, user_metadata: { name: req.name } });
      if (error || !data.user) throw error ?? new Error("create failed");
      id = data.user.id;
    }
    const { data: prof } = await db.from("profiles").select("is_member").eq("id", id).maybeSingle();
    if (!prof?.is_member && (count ?? 0) >= cap) return { ok: false, msg: `멤버 정원(${cap}명)이 찼습니다. 정원을 늘리거나 다른 멤버를 해제한 뒤 다시 승인해 주십시오.` };
    const patch: { is_member: true; display_name?: string; discipline?: string } = { is_member: true };
    if (fresh) patch.display_name = req.name;
    if (req.field) patch.discipline = req.field;
    const { error: pe } = await db.from("profiles").update(patch).eq("id", id);
    if (pe) {
      if (/member cap/.test(pe.message)) return { ok: false, msg: `멤버 정원(${cap}명)이 찼습니다.` };
      throw pe;
    }
  } catch (e) {
    console.error("join approve", (e as Error)?.message);
    return { ok: false, msg: "승인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주십시오." };
  }
  await db.from("member_requests").update({ status: "approved", decided_at: new Date().toISOString() }).eq("id", req.id);
  after(() => sendJoinApproved(req.email, req.lang).catch((e) => console.error("join mail", e?.message)));
  return { ok: true, msg: "승인했습니다. 신청자에게 로그인 안내 메일을 보냈습니다." };
}
