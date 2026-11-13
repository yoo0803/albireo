"use server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { after } from "next/server";
import { mailer, sendConfirm, sendWelcome } from "@/lib/mail";
import { getLang, getT } from "@/lib/i18n/server";

export type SubState = { ok: boolean; msg: string } | null;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID = /^[0-9a-f-]{36}$/;
const COOLDOWN = 2 * 60_000, HOURLY_CAP = 40;

// 구독 신청: 확인 메일 발송 (이중 확인)
export async function subscribe(_: SubState, form: FormData): Promise<SubState> {
  const t = await getT();
  const sent = { ok: true, msg: t("확인 메일을 보내 드렸습니다. 메일함에서 ‘구독 확인’을 누르시면 구독이 완료됩니다.", "We’ve sent a confirmation email. Tap ‘Confirm subscription’ to finish.") };
  if (String(form.get("website") ?? "")) return sent; // 봇 함정 칸
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, msg: t("메일 주소를 다시 확인해 주십시오.", "Please check the email address.") };
  const db = supabaseAdmin();
  if (!db || !mailer()) return { ok: false, msg: t("구독 기능을 준비하고 있습니다.", "Subscriptions aren’t open yet.") };

  // 전체 발송량 제한 (남용 방지)
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("subscribers").select("id", { count: "exact", head: true }).gt("confirm_sent_at", hourAgo);
  if ((count ?? 0) >= HOURLY_CAP) return { ok: false, msg: t("잠시 후 다시 시도해 주십시오.", "Please try again later.") };

  const lang = await getLang();
  const { data: cur } = await db.from("subscribers").select("*").eq("email", email).maybeSingle();
  if (cur?.confirmed_at && !cur.unsubscribed_at) return sent; // 이미 구독 중: 같은 안내
  if (cur?.confirm_sent_at && Date.now() - Date.parse(cur.confirm_sent_at) < COOLDOWN) return sent;

  const token = crypto.randomUUID();
  const row = { email, lang, token, confirmed_at: null, unsubscribed_at: null, confirm_sent_at: new Date().toISOString() };
  const { error } = cur ? await db.from("subscribers").update(row).eq("id", cur.id) : await db.from("subscribers").insert(row);
  if (error) return { ok: false, msg: t("잠시 후 다시 시도해 주십시오.", "Please try again later.") };
  try {
    await sendConfirm(email, token, lang);
  } catch {
    return { ok: false, msg: t("메일을 보내지 못했습니다. 잠시 후 다시 시도해 주십시오.", "Couldn’t send the email. Please try again later.") };
  }
  return sent;
}

// 구독 확인 (메일 링크): 처음 확인 시 환영 메일
export async function confirmSubscription(token: string) {
  const db = supabaseAdmin();
  if (!db || !UUID.test(token)) return false;
  const { data: row } = await db.from("subscribers").select("id, email, lang, confirmed_at, unsubscribed_at").eq("token", token).maybeSingle();
  if (!row || row.unsubscribed_at) return false;
  if (row.confirmed_at) return true;
  const { data } = await db.from("subscribers").update({ confirmed_at: new Date().toISOString() }).eq("id", row.id).is("confirmed_at", null).select("id").maybeSingle();
  if (data) after(() => sendWelcome(row.email, token, row.lang).catch((e) => console.error("welcome", e?.message)));
  return true;
}

// 구독 해지
export async function unsubscribe(token: string) {
  const db = supabaseAdmin();
  if (!db || !UUID.test(token)) return false;
  const { data } = await db.from("subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("token", token).select("id").maybeSingle();
  return !!data;
}
