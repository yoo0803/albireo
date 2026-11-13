"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { env, isDemo } from "@/lib/env";
import { safePath } from "@/lib/safe-path";
import { getLang, getT } from "@/lib/i18n/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendJoinRequest } from "@/lib/mail";
import { isMemberEmail, linkThrottled } from "@/lib/join";
import { headers } from "next/headers";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; field?: "email" };

export async function sendMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  const t = await getT();
  if (isDemo) return { status: "error", message: t("데모 모드: Supabase 환경 변수 미설정", "Demo mode: Supabase env not set") };
  const email = String(form.get("email") ?? "").trim();
  const next = safePath(String(form.get("next") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: t("이메일 형식 오류", "Invalid email") };

  // 같은 곳에서 너무 자주 요청하면 잠시 막기 (메일 확인 남용 방지)
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (await linkThrottled(ip).catch(() => false)) return { status: "error", message: t("요청이 너무 많습니다. 잠시 후 다시 시도해 주십시오.", "Too many requests. Please try again later.") };
  // 등록된 멤버만
  const member = await isMemberEmail(email).catch(() => null);
  if (member === false) return { status: "error", field: "email", message: t("등록되지 않은 멤버입니다.", "Not a registered member.") };
  // 새 계정 생성 금지
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error && /rate|too many|seconds/i.test(error.message)) return { status: "error", message: t("요청이 너무 많습니다. 잠시 후 다시 시도해 주십시오.", "Too many requests. Please try again later.") };
  return { status: "sent" };
}

// 비밀번호 로그인: 성공 시 바로 작업실
export async function signInWithPassword(_: LoginState, form: FormData): Promise<LoginState> {
  const t = await getT();
  if (isDemo) return { status: "error", message: t("데모 모드: Supabase 환경 변수 미설정", "Demo mode: Supabase env not set") };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safePath(String(form.get("next") ?? ""));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 128) {
    return { status: "error", message: t("이메일 또는 비밀번호가 올바르지 않습니다.", "Incorrect email or password.") };
  }
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  // 계정 존재 여부를 드러내지 않는 같은 안내
  if (error) {
    const many = /rate|too many/i.test(error.message);
    return { status: "error", message: many ? t("시도가 너무 많습니다. 잠시 후 다시 시도해 주십시오.", "Too many attempts. Please try again later.") : t("이메일 또는 비밀번호가 올바르지 않습니다.", "Incorrect email or password.") };
  }
  redirect(next);
}

// 멤버 가입 신청: 관리자에게 승인 요청 메일
export type JoinState = { ok: boolean; msg: string } | null;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const JOIN_HOURLY_CAP = 10;

export async function requestMembership(_: JoinState, form: FormData): Promise<JoinState> {
  const t = await getT();
  const done = { ok: true, msg: t("가입 신청을 보내 드렸습니다. 관리자가 승인하면 메일로 안내해 드리겠습니다.", "Your request has been sent. We’ll email you once an admin approves it.") };
  if (String(form.get("website") ?? "")) return done; // 봇 함정 칸
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const field = String(form.get("field") ?? "").trim().slice(0, 40) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 600) || null;
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, msg: t("메일 주소를 다시 확인해 주십시오.", "Please check the email address.") };
  if (!name || name.length > 40) return { ok: false, msg: t("이름을 입력해 주십시오. (40자 이내)", "Please enter your name (up to 40 characters).") };

  const db = supabaseAdmin();
  if (!db) return { ok: false, msg: t("가입 신청을 준비하고 있습니다.", "Membership requests aren’t open yet.") };

  // 전체 신청량 제한
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("member_requests").select("id", { count: "exact", head: true }).gt("created_at", hourAgo);
  if ((count ?? 0) >= JOIN_HOURLY_CAP) return { ok: false, msg: t("잠시 후 다시 시도해 주십시오.", "Please try again later.") };

  // 같은 메일 대기 신청이 있으면 같은 안내
  const { data: cur } = await db.from("member_requests").select("id").eq("email", email).eq("status", "pending").maybeSingle();
  if (cur) return done;

  const lang = await getLang();
  const { data: row, error } = await db.from("member_requests").insert({ email, name, field, note, lang }).select("token").single();
  if (error || !row) return { ok: false, msg: t("잠시 후 다시 시도해 주십시오.", "Please try again later.") };
  try {
    await sendJoinRequest({ name, email, field, note }, row.token);
  } catch {
    await db.from("member_requests").delete().eq("token", row.token);
    return { ok: false, msg: t("메일을 보내지 못했습니다. 잠시 후 다시 시도해 주십시오.", "Couldn’t send the request. Please try again later.") };
  }
  return done;
}
