import "server-only";
import { createHash } from "node:crypto";
import { getViewer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/env";

// 가입 신청 검토 (서버 전용)
type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;
const UUID = /^[0-9a-f-]{36}$/;
export const JOIN_TTL = 7 * 864e5;

// 관리자 확인 (로그인 · 멤버 · profiles.is_admin)
export async function viewerIsAdmin() {
  const { user, profile } = await getViewer();
  return !!user && isAdmin(profile);
}

// 토큰으로 신청 조회
export async function pendingRequest(token: string) {
  const db = supabaseAdmin();
  if (!db || !UUID.test(token)) return null;
  const { data } = await db.from("member_requests").select("*").eq("token", token).maybeSingle();
  return data;
}

// 메일로 계정 찾기
export async function findUserId(db: Db, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

// 등록된 멤버 메일인지 (DB 함수 한 번 · 서버 전용)
export async function isMemberEmail(email: string) {
  const db = supabaseAdmin();
  if (!db) return null; // 확인 불가
  const { data, error } = await db.rpc("member_email_exists", { e: email.toLowerCase() });
  return error ? null : !!data;
}

// 로그인 링크 요청 제한: 같은 곳에서 1시간 8번
export async function linkThrottled(ip: string) {
  const db = supabaseAdmin();
  if (!db || !ip) return false;
  const who = createHash("sha256").update(`albireo-login:${ip}`).digest("hex");
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("login_link_log").select("id", { count: "exact", head: true }).eq("who", who).gt("at", hourAgo);
  if ((count ?? 0) >= 8) return true;
  await db.from("login_link_log").insert({ who });
  return false;
}
