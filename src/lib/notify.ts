import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mailer, sendIssue } from "@/lib/mail";

// 발행 알림: 글마다 1회 (notified_at 선점 후 발송)
export async function notifySubscribers(articleId: string) {
  const db = supabaseAdmin();
  if (!db || !mailer()) return;
  const { data: a } = await db
    .from("articles")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", articleId)
    .eq("is_public", true)
    .is("notified_at", null)
    .is("deleted_at", null)
    .select("slug, title, title_en, excerpt, excerpt_en, author_id")
    .maybeSingle();
  if (!a) return;
  const [{ data: author }, { data: subs }] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", a.author_id).maybeSingle(),
    db.from("subscribers").select("email, token, lang").not("confirmed_at", "is", null).is("unsubscribed_at", null),
  ]);
  const issue = { ...a, author: author?.display_name ?? "Albireo" };
  // 5통씩 순차 발송
  const list = subs ?? [];
  for (let i = 0; i < list.length; i += 5) {
    await Promise.all(list.slice(i, i + 5).map((s) => sendIssue(s.email, s.token, s.lang, issue).catch((e) => console.error("notify", s.email.replace(/^(.).*@/, "$1***@"), e?.message))));
  }
}
