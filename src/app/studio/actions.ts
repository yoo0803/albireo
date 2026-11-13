"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifySubscribers } from "@/lib/notify";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { extractTerms } from "@/lib/text/wikilink";
import { slugify } from "@/lib/text/slug";
import { REVIEW_CHECKLIST } from "@/content/review-guideline";
import type { Discipline, Json, ReviewVerdict, SeriesCadence, SeriesKind, SeriesStatus } from "@/types/database";
import { cleanField } from "@/content/fields";
import { cleanPrefs, cleanStyle, type ArticleStyle } from "@/lib/text/style";
import { getT } from "@/lib/i18n/server";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findUserId } from "@/lib/join";
import type { T } from "@/lib/i18n";

const LIMIT = { title: 200, subtitle: 200, excerpt: 200, body: 200_000, tags: 12, tag: 40 };

type Result = { ok: true } | { ok: false; error: string };

// 멤버 가드
async function member() {
  const v = await getViewer();
  if (!v.user || !v.profile?.is_member) throw new Error("members only");
  return v as typeof v & { user: NonNullable<typeof v.user>; profile: NonNullable<typeof v.profile> };
}

// ─── 아티클 ──────────────────────────────────────────
export async function createArticle(form: FormData) {
  const { sb, profile } = await member();
  const title = String(form.get("title") ?? "").trim() || "Untitled";
  const prefs = cleanPrefs(profile.prefs);
  const discipline = cleanField(form.get("discipline")) ?? prefs.field ?? profile.discipline ?? "cs";
  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await sb.from("articles").insert({ title, slug, discipline, author_id: profile.id, style: prefs.style as Json }).select("id").single();
  if (error) throw error;
  redirect(`/studio/articles/${data.id}`);
}

export type ArticleDraft = {
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  body_md: string;
  tags: string[];
  discipline: Discipline;
  slug: string;
  cover_url: string | null;
  style: ArticleStyle;
  title_en: string | null;
  subtitle_en: string | null;
  excerpt_en: string | null;
  body_en: string | null;
  series_id: string | null;
  series_no: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const episodeNo = (n: unknown) => {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) && v >= 1 && v <= 999 ? v : null;
};

// 입력 정규화 · 상한
function cleanDraft(d: ArticleDraft, t: T): ArticleDraft | string {
  const title = String(d.title ?? "").trim();
  if (!title || title.length > LIMIT.title) return t("제목 1–200자", "Title must be 1–200 characters");
  if ((d.body_md ?? "").length > LIMIT.body || (d.body_en ?? "").length > LIMIT.body) return t("본문 200,000자 초과", "Body exceeds 200,000 characters");
  const cover = d.cover_url?.trim() || null;
  if (cover && !/^https:\/\/[^\s"'<>]+$/.test(cover)) return t("커버는 https 주소만", "Cover must be an https URL");
  const discipline = cleanField(d.discipline);
  if (!discipline) return t("분야 입력 필요", "Field required");
  return {
    title,
    subtitle: d.subtitle?.trim().slice(0, LIMIT.subtitle) || null,
    excerpt: d.excerpt?.trim().slice(0, LIMIT.excerpt) || null,
    body_md: d.body_md ?? "",
    tags: (d.tags ?? []).map((t) => String(t).trim().slice(0, LIMIT.tag)).filter(Boolean).slice(0, LIMIT.tags),
    discipline,
    slug: slugify(String(d.slug ?? title)),
    cover_url: cover,
    style: cleanStyle(d.style),
    title_en: d.title_en?.trim().slice(0, LIMIT.title) || null,
    subtitle_en: d.subtitle_en?.trim().slice(0, LIMIT.subtitle) || null,
    excerpt_en: d.excerpt_en?.trim().slice(0, LIMIT.excerpt) || null,
    body_en: d.body_en?.trim() ? d.body_en : null,
    series_id: d.series_id && UUID.test(d.series_id) ? d.series_id : null,
    series_no: d.series_id && UUID.test(d.series_id) ? episodeNo(d.series_no) : null,
  };
}

export async function saveArticle(id: string, input: ArticleDraft): Promise<Result> {
  const { sb } = await member();
  const draft = cleanDraft(input, await getT());
  if (typeof draft === "string") return { ok: false, error: draft };
  const { error } = await sb.from("articles").update({ ...draft, style: draft.style as Json }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await syncConcepts(id, draft.body_md);
  revalidatePath(`/studio/articles/${id}`);
  // 발행된 글: 공개 쪽에도 바로 반영 (발행 취소 없이 수정)
  revalidatePath(`/articles/${draft.slug}`);
  revalidatePath("/articles");
  revalidatePath("/series", "layout");
  revalidatePath("/");
  return { ok: true };
}

// [[개념어]] → concepts + concept_links
async function syncConcepts(articleId: string, md: string) {
  const { sb } = await member();
  const terms = extractTerms(md);

  if (terms.length) await sb.from("concepts").upsert(terms.map((term) => ({ term })), { onConflict: "term", ignoreDuplicates: true });
  const { data: rows } = terms.length ? await sb.from("concepts").select("id, term").in("term", terms) : { data: [] };
  const ids = new Set((rows ?? []).map((r) => r.id));

  const { data: existing } = await sb.from("concept_links").select("concept_id").eq("article_id", articleId);
  const stale = (existing ?? []).map((l) => l.concept_id).filter((c) => !ids.has(c));
  if (stale.length) await sb.from("concept_links").delete().eq("article_id", articleId).in("concept_id", stale);

  const fresh = [...ids].filter((c) => !(existing ?? []).some((l) => l.concept_id === c));
  if (fresh.length) await sb.from("concept_links").insert(fresh.map((concept_id) => ({ article_id: articleId, concept_id })));
}

export async function setStatus(id: string, status: "draft" | "in_review"): Promise<Result> {
  const { sb } = await member();
  const { error } = await sb.from("articles").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/studio/articles/${id}`);
  return { ok: true };
}

// 원클릭 공개 전환 (DB 트리거가 리뷰 정족수 검증)
export async function setPublic(id: string, isPublic: boolean): Promise<Result> {
  const t = await getT();
  const { sb } = await member();
  const { data, error } = await sb.from("articles").update({ is_public: isPublic }).eq("id", id).select("slug").single();
  if (error) return { ok: false, error: error.code === "P0001" ? t("휴지통 원고는 발행 불가", "Trashed manuscripts can’t be published") : error.message };
  revalidatePath(`/articles/${data.slug}`);
  revalidatePath("/articles");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  // 구독자 알림 (응답 후)
  if (isPublic) after(() => notifySubscribers(id));
  return { ok: true };
}

export async function setCoauthor(articleId: string, profileId: string, contribution: string | null): Promise<Result> {
  const { sb } = await member();
  const { error } = await sb
    .from("article_authors")
    .upsert({ article_id: articleId, profile_id: profileId, contribution: contribution?.trim().slice(0, 80) || null });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/studio/articles/${articleId}`);
  return { ok: true };
}

export async function removeCoauthor(articleId: string, profileId: string): Promise<Result> {
  const { sb } = await member();
  const { error } = await sb.from("article_authors").delete().eq("article_id", articleId).eq("profile_id", profileId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/studio/articles/${articleId}`);
  return { ok: true };
}

// ─── 피어 리뷰 ───────────────────────────────────────
export async function submitReview(articleId: string, verdict: ReviewVerdict, checklist: Record<string, boolean>, note: string): Promise<Result> {
  const t = await getT();
  const { sb, profile } = await member();
  // 허용 키만 · 승인은 전 항목 필수
  const clean = Object.fromEntries(REVIEW_CHECKLIST.map((c) => [c.id, checklist?.[c.id] === true]));
  if (verdict === "approve" && !Object.values(clean).every(Boolean)) return { ok: false, error: t("체크리스트 전 항목 필요", "Tick every checklist item") };
  if (verdict !== "approve" && verdict !== "request_changes") return { ok: false, error: t("판정 값 오류", "Invalid verdict") };
  checklist = clean;
  note = String(note ?? "").slice(0, 2000);
  const { error } = await sb.from("peer_reviews").upsert({
    article_id: articleId,
    reviewer_id: profile.id,
    verdict,
    checklist: checklist as Json,
    note: note || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/studio/articles/${articleId}`);
  return { ok: true };
}

// ─── 토론 ────────────────────────────────────────────
export async function createTopic(form: FormData) {
  const { sb, profile } = await member();
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) return;
  // 연달아 누른 경우: 1분 안에 같은 제목이면 새로 만들지 않음
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data: dup } = await sb.from("debate_topics").select("id").eq("created_by", profile.id).eq("title", title).is("deleted_at", null).gt("created_at", since).limit(1).maybeSingle();
  if (dup) redirect(`/studio/debate/${dup.id}`);
  const { data, error } = await sb
    .from("debate_topics")
    .insert({ title, prompt: String(form.get("prompt") ?? "") || null, article_id: String(form.get("article_id") ?? "") || null, created_by: profile.id })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/studio/debate/${data.id}`);
}

// ─── 연재 · 정기간행 ──────────────────────────────────
const KINDS: SeriesKind[] = ["serial", "periodical"];
const CADENCES: SeriesCadence[] = ["weekly", "biweekly", "monthly", "quarterly", "irregular"];
const STATUSES: SeriesStatus[] = ["ongoing", "paused", "completed"];
export type SeriesInput = { title: string; title_en: string | null; blurb: string | null; blurb_en: string | null; kind: SeriesKind; cadence: SeriesCadence; status: SeriesStatus };

function cleanSeries(d: Partial<SeriesInput>, t: T): SeriesInput | string {
  const title = String(d.title ?? "").trim().slice(0, 80);
  if (!title) return t("연재 제목을 입력하세요.", "Give the series a title.");
  const opt = (x: unknown, n: number) => String(x ?? "").trim().slice(0, n) || null;
  return {
    title,
    title_en: opt(d.title_en, 80),
    blurb: opt(d.blurb, 280),
    blurb_en: opt(d.blurb_en, 280),
    kind: KINDS.includes(d.kind as SeriesKind) ? (d.kind as SeriesKind) : "serial",
    cadence: CADENCES.includes(d.cadence as SeriesCadence) ? (d.cadence as SeriesCadence) : "irregular",
    status: STATUSES.includes(d.status as SeriesStatus) ? (d.status as SeriesStatus) : "ongoing",
  };
}
const seriesSlug = (title: string) => `${slugify(title).replace(/^-+|-+$/g, "").slice(0, 50) || "series"}-${Math.random().toString(36).slice(2, 6)}`;
const touchSeries = () => { revalidatePath("/studio/series"); revalidatePath("/series", "layout"); revalidatePath("/articles"); };

export async function createSeries(form: FormData): Promise<Result> {
  const { sb } = await member();
  const d = cleanSeries(Object.fromEntries(form) as Partial<SeriesInput>, await getT());
  if (typeof d === "string") return { ok: false, error: d };
  const { error } = await sb.from("series").insert({ ...d, slug: seriesSlug(d.title) });
  if (error) return { ok: false, error: error.message };
  touchSeries();
  return { ok: true };
}

// 수정 · 삭제: 만든 멤버 (DB 정책이 한 번 더 확인)
export async function updateSeries(id: string, input: Partial<SeriesInput>): Promise<Result> {
  const { sb } = await member();
  const t = await getT();
  const d = cleanSeries(input, t);
  if (typeof d === "string") return { ok: false, error: d };
  const { data, error } = await sb.from("series").update(d).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: t("만든 멤버만 고칠 수 있습니다.", "Only the member who made it can edit.") };
  touchSeries();
  return { ok: true };
}

export async function deleteSeries(id: string): Promise<Result> {
  const { sb } = await member();
  const t = await getT();
  const { data, error } = await sb.from("series").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: t("만든 멤버만 지울 수 있습니다.", "Only the member who made it can delete.") };
  touchSeries();
  return { ok: true };
}

// 다음 회차 원고 바로 만들기
export async function createEpisode(form: FormData) {
  const { sb, profile } = await member();
  const seriesId = String(form.get("series_id") ?? "");
  if (!UUID.test(seriesId)) return;
  const { data: s } = await sb.from("series").select("id, title, kind").eq("id", seriesId).maybeSingle();
  if (!s) return;
  const { data: rows } = await sb.from("articles").select("series_no").eq("series_id", seriesId).is("deleted_at", null);
  const next = Math.min(999, Math.max(0, ...(rows ?? []).map((r) => r.series_no ?? 0)) + 1);
  const t = await getT();
  const title = `${s.title} ${s.kind === "periodical" ? t(`제${next}호`, `No. ${next}`) : t(`${next}화`, `Ep. ${next}`)}`;
  const prefs = cleanPrefs(profile.prefs);
  const { data, error } = await sb
    .from("articles")
    .insert({ title, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`, discipline: prefs.field ?? profile.discipline ?? "cs", author_id: profile.id, style: prefs.style as Json, series_id: seriesId, series_no: next })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/studio/series");
  redirect(`/studio/articles/${data.id}`);
}

// ─── 캔버스 ──────────────────────────────────────────
export async function createCanvas(form: FormData) {
  const { sb, profile } = await member();
  const { data, error } = await sb
    .from("canvases")
    .insert({ title: String(form.get("title") ?? "").trim() || "Untitled canvas", owner_id: profile.id })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/studio/canvas/${data.id}`);
}

// 캔버스 잠금 (만든 사람만 · DB 트리거가 한 번 더 확인)
export async function setCanvasLock(id: string, locked: boolean): Promise<Result> {
  const { sb, profile } = await member();
  const { data, error } = await sb.from("canvases").update({ locked }).eq("id", id).eq("owner_id", profile.id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: (await getT())("만든 사람만 잠글 수 있습니다.", "Only the owner can lock this canvas.") };
  revalidatePath("/studio/canvas");
  return { ok: true };
}

export async function saveCanvas(id: string, title: string, doc: Json): Promise<Result> {
  const { sb } = await member();
  const { error } = await sb.from("canvases").update({ title, doc }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// 캔버스 발췌 이미지 → 원고 끝에 추가 (media 버킷 공개 주소만)
export async function appendImage(articleId: string, url: string, alt: string): Promise<Result> {
  const { sb } = await member();
  const base = `${env.supabaseUrl}/storage/v1/object/public/media/`;
  if (!url.startsWith(base) || /[\s()"'<>]/.test(url.slice(base.length))) return { ok: false, error: "bad url" };
  const { data: a, error } = await sb.from("articles").select("body_md").eq("id", articleId).is("deleted_at", null).maybeSingle();
  if (error || !a) return { ok: false, error: error?.message ?? "not found" };
  const caption = alt.replace(/[\[\]\n]/g, " ").trim().slice(0, 120) || "canvas";
  const body = `${(a.body_md ?? "").replace(/\s+$/, "")}\n\n![${caption}](${url})\n`;
  if (body.length > LIMIT.body) return { ok: false, error: "body too long" };
  const { error: e2 } = await sb.from("articles").update({ body_md: body }).eq("id", articleId);
  if (e2) return { ok: false, error: e2.message };
  revalidatePath(`/studio/articles/${articleId}`);
  return { ok: true };
}

// ─── 프로필 ──────────────────────────────────────────
export async function updateProfile(form: FormData): Promise<void> {
  const { sb, profile } = await member();
  const display_name = String(form.get("display_name") ?? "").trim().slice(0, 40);
  if (!display_name) return;
  // 연락 메일: 형식 맞을 때만 (비우면 표시 안 함)
  const rawContact = String(form.get("contact_email") ?? "").trim().slice(0, 120);
  const contact = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawContact) ? rawContact : null;
  // 핸들은 이름에서 자동 (DB 트리거)
  const { data } = await sb.from("profiles").update({
    display_name,
    role_title: String(form.get("role_title") ?? "").trim().slice(0, 80) || null,
    bio: String(form.get("bio") ?? "").trim().slice(0, 600) || null,
    contact_email: contact,
  }).eq("id", profile.id).select("handle").maybeSingle();
  revalidatePath("/studio", "layout");
  revalidatePath(`/authors/${profile.handle}`);
  if (data?.handle) revalidatePath(`/authors/${data.handle}`);
}

// 로그아웃
export async function signOut(): Promise<void> {
  const v = await getViewer();
  await v.sb.auth.signOut();
  redirect("/");
}

// ─── 로그인 계정 연결 ────────────────────────────────
// 비멤버 계정: 기존 멤버 프로필에 연결 요청
export async function requestLogin(form: FormData): Promise<void> {
  const { sb, user, profile } = await getViewer();
  if (!user || profile?.is_member) return;
  const target = String(form.get("profile") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(target)) return;
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || null;
  // 거절 · 대기 중인 이전 요청은 새 요청으로 교체
  await sb.from("profile_logins").delete().eq("user_id", user.id).neq("status", "approved");
  await sb.from("profile_logins").insert({ user_id: user.id, profile_id: target, note });
  revalidatePath("/studio", "layout");
}

// 로그인한 멤버가 직접 계정 추가: 승인 절차 없이 바로 연결
export async function addLogin(email: string): Promise<Result> {
  const t = await getT();
  const { profile } = await member();
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 200) return { ok: false, error: t("이메일 형식 오류", "Invalid email") };
  const db = supabaseAdmin();
  if (!db) return { ok: false, error: t("서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 필요합니다.", "Server key (SUPABASE_SERVICE_ROLE_KEY) required.") };
  try {
    let id = await findUserId(db, e);
    if (!id) {
      // 계정 생성 (비밀번호 없음 · 로그인 링크로 첫 로그인)
      const { data, error } = await db.auth.admin.createUser({ email: e, email_confirm: true });
      if (error || !data.user) throw error ?? new Error("create failed");
      id = data.user.id;
    }
    if (id === profile.id) return { ok: false, error: t("지금 쓰는 기본 계정입니다.", "That’s this profile’s main account.") };
    const { data: other } = await db.from("profiles").select("is_member").eq("id", id).maybeSingle();
    if (other?.is_member) return { ok: false, error: t("다른 멤버의 기본 계정이라 연결할 수 없습니다.", "That email belongs to another member.") };
    const { data: link } = await db.from("profile_logins").select("profile_id, status").eq("user_id", id).maybeSingle();
    if (link?.status === "approved" && link.profile_id !== profile.id) return { ok: false, error: t("이미 다른 프로필에 연결된 계정입니다.", "Already linked to another profile.") };
    const { error } = await db.from("profile_logins").upsert({
      user_id: id, profile_id: profile.id, status: "approved", decided_at: new Date().toISOString(), decided_by: profile.id,
    });
    if (error) throw error;
  } catch (err) {
    console.error("add login", (err as Error)?.message);
    return { ok: false, error: t("추가하지 못했습니다. 잠시 후 다시 시도해 주십시오.", "Couldn’t add it. Please try again.") };
  }
  revalidatePath("/studio/settings");
  return { ok: true };
}

// 요청 취소 (요청자)
export async function cancelLogin(): Promise<void> {
  const { sb, user } = await getViewer();
  if (!user) return;
  await sb.from("profile_logins").delete().eq("user_id", user.id).neq("status", "approved");
  revalidatePath("/studio", "layout");
}

// 승인 · 거절 · 해제 (프로필 측)
export async function decideLogin(userId: string, decision: "approved" | "declined" | "remove"): Promise<Result> {
  const t = await getT();
  const { sb, user, profile } = await member();
  if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === user.id) return { ok: false, error: t("잘못된 요청", "Bad request") };
  const q = decision === "remove"
    ? sb.from("profile_logins").delete().eq("user_id", userId).eq("profile_id", profile.id).select("user_id")
    : sb.from("profile_logins").update({ status: decision, decided_at: new Date().toISOString(), decided_by: profile.id }).eq("user_id", userId).eq("profile_id", profile.id).select("user_id");
  const { data, error } = await q;
  if (error || !data?.length) return { ok: false, error: t("처리하지 못했습니다.", "Couldn’t update.") };
  revalidatePath("/studio/settings");
  return { ok: true };
}

// 비밀번호 설정 · 변경 (멤버 본인)
export type PwState = { ok: boolean; msg: string } | null;
export async function setPassword(_: PwState, form: FormData): Promise<PwState> {
  const t = await getT();
  const { sb } = await member();
  const pw = String(form.get("password") ?? "");
  const again = String(form.get("password2") ?? "");
  if (pw.length < 8) return { ok: false, msg: t("비밀번호는 8자 이상이어야 합니다.", "Use at least 8 characters.") };
  if (new TextEncoder().encode(pw).length > 72) return { ok: false, msg: t("비밀번호가 너무 깁니다.", "That password is too long.") };
  // Supabase 규칙과 같게: 글자와 숫자를 함께
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return { ok: false, msg: t("영문 글자와 숫자를 함께 넣어 주십시오.", "Use both letters and digits.") };
  if (pw !== again) return { ok: false, msg: t("두 비밀번호가 일치하지 않습니다.", "The passwords don’t match.") };
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) {
    if (/same/i.test(error.message)) return { ok: false, msg: t("기존 비밀번호와 다른 비밀번호를 입력해 주십시오.", "Choose a password different from the current one.") };
    if (/weak|pwned|leaked/i.test(error.message)) return { ok: false, msg: t("더 안전한 비밀번호를 사용해 주십시오.", "Please choose a stronger password.") };
    if (/reauth|recent|nonce/i.test(error.message)) return { ok: false, msg: t("보안을 위해 로그인한 지 하루가 지나면 다시 로그인해야 합니다. 로그인 링크로 다시 로그인한 뒤 설정해 주십시오.", "For security, sign in again with an email link, then try.") };
    return { ok: false, msg: t("설정하지 못했습니다. 잠시 후 다시 시도해 주십시오.", "Couldn’t save. Please try again later.") };
  }
  return { ok: true, msg: t("비밀번호가 설정되었습니다. 다음부터 이메일과 비밀번호로 바로 로그인하실 수 있습니다.", "Password saved. Next time, sign in with your email and password.") };
}

// ─── 휴지통 ──────────────────────────────────────────
export type TrashKind = "articles" | "canvases" | "debate_topics";
const TRASH_KINDS: TrashKind[] = ["articles", "canvases", "debate_topics"];
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

export async function trashItem(kind: TrashKind, id: string): Promise<Result> {
  const t = await getT();
  if (!TRASH_KINDS.includes(kind) || !isUuid(id)) return { ok: false, error: t("잘못된 요청", "Bad request") };
  const { sb } = await member();
  const { data, error } = await sb.from(kind).update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: t("권한 없음", "Not allowed") };
  revalidatePath("/studio", "layout");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function restoreItem(kind: TrashKind, id: string): Promise<Result> {
  const t = await getT();
  if (!TRASH_KINDS.includes(kind) || !isUuid(id)) return { ok: false, error: t("잘못된 요청", "Bad request") };
  const { sb } = await member();
  const { data, error } = await sb.from(kind).update({ deleted_at: null }).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: t("권한 없음", "Not allowed") };
  revalidatePath("/studio", "layout");
  return { ok: true };
}

// 영구 삭제: 휴지통 항목만, 작성자만 (RLS)
export async function purgeItem(kind: TrashKind, id: string): Promise<Result> {
  const t = await getT();
  if (!TRASH_KINDS.includes(kind) || !isUuid(id)) return { ok: false, error: t("잘못된 요청", "Bad request") };
  const { sb } = await member();
  const { data, error } = await sb.from(kind).delete().eq("id", id).not("deleted_at", "is", null).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: t("작성자만 영구 삭제 가능", "Only the author can delete permanently") };
  revalidatePath("/studio/trash");
  return { ok: true };
}

// 여러 개 한꺼번에: 휴지통 · 복원 · 영구 삭제
export type BulkResult = { ok: number; failed: number };
export async function bulkItems(mode: "trash" | "restore" | "purge", items: { kind: TrashKind; id: string }[]): Promise<BulkResult> {
  const { sb } = await member();
  const list = items.filter((i) => TRASH_KINDS.includes(i.kind) && isUuid(i.id)).slice(0, 300);
  let ok = 0;
  for (const kind of TRASH_KINDS) {
    const ids = list.filter((i) => i.kind === kind).map((i) => i.id);
    if (!ids.length) continue;
    const q = mode === "purge"
      ? sb.from(kind).delete().in("id", ids).not("deleted_at", "is", null)
      : sb.from(kind).update({ deleted_at: mode === "trash" ? new Date().toISOString() : null }).in("id", ids);
    const { data } = await q.select("id");
    ok += data?.length ?? 0;
  }
  revalidatePath("/studio", "layout");
  if (mode === "trash") revalidatePath("/", "layout");
  return { ok, failed: list.length - ok };
}

// 30일 지난 휴지통 비우기 (휴지통을 열 때)
export async function purgeExpired() {
  const { sb } = await member();
  await sb.rpc("purge_expired_trash");
}

// ─── 하이라이트 (최대 3, 검수 인증 공개글) ────────────
export async function savePins(form: FormData): Promise<void> {
  const t = await getT();
  const { sb, profile } = await member();
  const ids = [1, 2, 3].map((n) => String(form.get(`pin${n}`) ?? "")).filter((v) => isUuid(v));
  const uniq = [...new Set(ids)].slice(0, 3);
  await sb.from("profile_pins").delete().eq("profile_id", profile.id);
  if (uniq.length) {
    const { error } = await sb.from("profile_pins").insert(uniq.map((article_id, i) => ({ profile_id: profile.id, article_id, position: i + 1 })));
    if (error) throw new Error(t("검수 인증된 공개 글만 고정 가능", "Only peer-reviewed published articles can be pinned"));
  }
  revalidatePath("/authors", "layout");
  revalidatePath("/studio/settings");
}

// ─── 개인 기본값 ─────────────────────────────────────
export async function savePrefs(form: FormData): Promise<void> {
  const { sb, profile } = await member();
  let raw: unknown = {};
  try { raw = JSON.parse(String(form.get("prefs") ?? "{}")); } catch {}
  const prefs = cleanPrefs(raw);
  const { error } = await sb.from("profiles").update({ prefs: prefs as unknown as Json }).eq("id", profile.id);
  if (error) throw new Error(error.message);
  revalidatePath("/studio/settings");
}
