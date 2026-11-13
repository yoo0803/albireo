// RLS · 트리거 정책 검증 (빈 PostgreSQL + Supabase 스텁)
// 실행: DATABASE_URL=postgres://postgres:pw@localhost:5432/albireo_test npm run test:db
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL required"); process.exit(2); }
const c = new pg.Client({ connectionString: url });
await c.connect();

const FULL = '{"claim":true,"source":true,"data":true,"lens":true,"language":true,"ethics":true}';
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

// Supabase 스텁
await c.query(`
create extension if not exists pgcrypto; create extension if not exists citext;
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create publication supabase_realtime;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
grant usage on schema storage to anon, authenticated;
grant select, insert on storage.objects to anon, authenticated;
`);

for (const f of fs.readdirSync(ROOT).sort()) {
  try { await c.query(fs.readFileSync(path.join(ROOT, f), "utf8")); check(`migration ${f}`, true); }
  catch (e) { check(`migration ${f}`, false, e.message); }
}

// 유저 생성
const ids = {};
for (const n of ["yeji", "lee", "seo", "han", "outsider"]) {
  const r = await c.query("insert into auth.users (email) values ($1) returning id", [`${n}@uni.edu`]);
  ids[n] = r.rows[0].id;
}
const prof = await c.query("select count(*)::int n from profiles");
check("signup trigger creates profiles", prof.rows[0].n === 5);

for (const n of ["yeji", "lee", "seo", "han"]) await c.query("update profiles set is_member = true where id = $1", [ids[n]]);
try { await c.query("update profiles set is_member = true where id = $1", [ids.outsider]); check("5th member blocked (cap 4)", false); }
catch (e) { check("5th member blocked (cap 4)", /member cap/.test(e.message), e.message); }

// 역할 전환 헬퍼
async function as(who, sql, params = []) {
  await c.query("begin");
  try {
    if (who === "anon") await c.query("set local role anon");
    else if (who === "service") await c.query("set local role service_role");
    else { await c.query("set local role authenticated"); await c.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[who]]); }
    const r = await c.query(sql, params);
    await c.query("commit");
    return { ok: true, r };
  } catch (e) { await c.query("rollback"); return { ok: false, e }; }
}

let x = await as("outsider", "insert into articles (slug, title, discipline, author_id) values ('x','x','cs',$1)", [ids.outsider]);
check("non-member cannot create article", !x.ok, x.e?.message);

x = await as("yeji", "insert into articles (slug, title, discipline, author_id, body_md) values ('rls','RLS','cs',$1,'첫 문장. [[RLS]] 와 [[트리거]].') returning id", [ids.yeji]);
check("member creates article", x.ok, x.e?.message);
const aid = x.r?.rows[0].id;

x = await as("anon", "select count(*)::int n from articles");
check("anon cannot see private draft", x.ok && x.r.rows[0].n === 0);

x = await as("outsider", "select count(*)::int n from articles");
check("non-member cannot see private draft", x.ok && x.r.rows[0].n === 0);

x = await as("yeji", "update articles set peer_reviewed = true where id = $1", [aid]);
check("peer_reviewed not client-writable", !x.ok, x.e?.message);

x = await as("yeji", "update articles set is_public = true where id = $1", [aid]);
check("publish before review allowed (unstamped)", x.ok, x.e?.message);
await as("yeji", "update articles set is_public = false where id = $1", [aid]);

x = await as("lee", "update articles set title = 'hijack' where id = $1 returning id", [aid]);
check("non-coauthor member cannot edit", x.ok && x.r.rowCount === 0);

x = await as("outsider", "insert into peer_reviews (article_id, reviewer_id, verdict) values ($1,$2,'approve')", [aid, ids.outsider]);
check("non-member cannot review", !x.ok, x.e?.message);

x = await as("lee", "insert into peer_reviews (article_id, reviewer_id, verdict) values ($1,$2,'approve')", [aid, ids.seo]);
check("cannot review on behalf of others", !x.ok, x.e?.message);

x = await as("yeji", "insert into peer_reviews (article_id, reviewer_id, verdict, checklist) values ($1,$2,'approve','{\"claim\":true}')", [aid, ids.yeji]);
check("approve requires full checklist", !x.ok, x.e?.message);
const approve = (n) => as(n, `insert into peer_reviews (article_id, reviewer_id, verdict, checklist) values ($1,$2,'approve','${FULL}') on conflict (article_id, reviewer_id) do update set verdict='approve', checklist=excluded.checklist`, [aid, ids[n]]);
await approve("yeji");
let st = await c.query("select peer_reviewed, status from articles where id=$1", [aid]);
check("1/2 approvals → not yet verified", st.rows[0].peer_reviewed === false);

await approve("lee");
st = await c.query("select peer_reviewed, status from articles where id=$1", [aid]);
check("2/2 approvals → Peer-Reviewed stamp", st.rows[0].peer_reviewed === true && st.rows[0].status === "approved");

await as("han", "insert into peer_reviews (article_id, reviewer_id, verdict) values ($1,$2,'request_changes')", [aid, ids.han]);
st = await c.query("select peer_reviewed from articles where id=$1", [aid]);
check("request_changes revokes stamp", st.rows[0].peer_reviewed === false);

x = await as("han", `update peer_reviews set verdict='approve', checklist='${FULL}' where article_id=$1 and reviewer_id=$2`, [aid, ids.han]);
st = await c.query("select peer_reviewed, status from articles where id=$1", [aid]);
check("change → approve restores stamp", x.ok && st.rows[0].peer_reviewed === true);

x = await as("yeji", "update articles set is_public = true where id = $1 returning published_at", [aid]);
check("one-click publish after review", x.ok && x.r.rows[0].published_at !== null, x.e?.message);

x = await as("anon", "select title from articles where id=$1", [aid]);
check("anon sees public article", x.ok && x.r.rowCount === 1);

x = await as("anon", "select * from public_reviewers($1)", [aid]);
check("public_reviewers RPC → 3", x.ok && x.r.rowCount === 3, x.e?.message);

x = await as("anon", "select count(*)::int n from peer_reviews");
check("anon cannot read raw reviews", !x.ok || x.r.rows[0].n === 0);

// 개념 링크 (복습 카드 자동 생성은 해제됨)
x = await as("yeji", "insert into concepts (term) values ('RLS'),('트리거') returning id");
const cids = x.r.rows.map((r) => r.id);
x = await as("yeji", "insert into concept_links (article_id, concept_id) values ($1,$2),($1,$3)", [aid, ...cids]);
check("concept links created", x.ok, x.e?.message);
st = await c.query("select count(*)::int n from srs_cards");
check("no SRS cards seeded after removal", st.rows[0].n === 0, `n=${st.rows[0].n}`);

// 캔버스 잠금 (017)
x = await as("yeji", "insert into canvases (title, owner_id) values ('private', $1) returning id", [ids.yeji]);
const cid = x.r?.rows[0].id;
x = await as("lee", "update canvases set locked = true where id = $1", [cid]);
check("only owner can lock canvas", !x.ok || x.r.rowCount === 0);
x = await as("yeji", "update canvases set locked = true where id = $1", [cid]);
check("owner locks canvas", x.ok && x.r.rowCount === 1, x.e?.message);
x = await as("lee", "select count(*)::int n from canvases where id = $1", [cid]);
check("locked canvas hidden from others", x.ok && x.r.rows[0].n === 0);
x = await as("lee", "update canvases set title = 'hijack' where id = $1", [cid]);
check("locked canvas not editable by others", !x.ok || x.r.rowCount === 0);
x = await as("yeji", "select count(*)::int n from canvases where id = $1", [cid]);
check("owner still sees locked canvas", x.ok && x.r.rows[0].n === 1);

// 보안 보강 (016)
x = await as("lee", "update profiles set is_admin = true where id = $1", [ids.lee]);
check("member cannot make self admin", !x.ok);
x = await as("lee", "select member_email_exists('yeji@uni.edu')");
check("member_email_exists hidden from users", !x.ok);
x = await as("anon", "select member_email_exists('yeji@uni.edu')");
check("member_email_exists hidden from anon", !x.ok);
x = await as("service", "select member_email_exists('YEJI@uni.edu') a, member_email_exists('outsider@uni.edu') b, member_email_exists('nobody@uni.edu') c");
check("member_email_exists: members only", x.ok && x.r.rows[0].a === true && x.r.rows[0].b === false && x.r.rows[0].c === false, x.e?.message);
x = await as("anon", "select count(*) from login_link_log");
check("anon cannot read login log", !x.ok);
x = await as("anon", "select count(*)::int n from backlinks($1)", [aid]);
check("backlinks of private draft hidden from anon", x.ok && x.r.rows[0].n === 0, x.e?.message);

// 휴지통 30일 자동 삭제
await c.query("insert into canvases (title, owner_id, deleted_at) values ('old', $1, now() - interval '31 days'), ('new', $1, now() - interval '2 days')", [ids.yeji]);
x = await as("outsider", "select purge_expired_trash() n");
check("non-member purge is no-op", x.ok && x.r.rows[0].n === 0, x.e?.message);
x = await as("anon", "select purge_expired_trash()");
check("anon cannot purge", !x.ok);
x = await as("yeji", "select purge_expired_trash() n");
st = await c.query("select title from canvases where deleted_at is not null order by title");
check("expired trash purged, recent kept", x.ok && x.r.rows[0].n >= 1 && st.rows.map((r) => r.title).join() === "new", x.e?.message ?? JSON.stringify(st.rows));

// 캔버스 발췌 이미지: 자기 폴더에만
x = await as("yeji", "insert into storage.objects (bucket_id, name) values ('media', $1)", [`${ids.yeji}/canvas/a.png`]);
check("member uploads to own media folder", x.ok, x.e?.message);
x = await as("yeji", "insert into storage.objects (bucket_id, name) values ('media', $1)", [`${ids.lee}/canvas/a.png`]);
check("member cannot upload to another folder", !x.ok);
x = await as("outsider", "insert into storage.objects (bucket_id, name) values ('media', $1)", [`${ids.outsider}/canvas/a.png`]);
check("non-member cannot upload media", !x.ok);
x = await as("anon", "select count(*)::int n from storage.objects where bucket_id = 'media'");
check("anyone can read media", x.ok && x.r.rows[0].n === 1, x.e?.message);

// 백링크
await as("lee", "insert into articles (slug, title, discipline, author_id) values ('t2','T2','chem',$1)", [ids.lee]);
const a2 = (await c.query("select id from articles where slug='t2'")).rows[0].id;
await as("lee", "insert into concept_links (article_id, concept_id) values ($1,$2)", [a2, cids[0]]);
x = await as("yeji", "select * from backlinks($1)", [aid]);
check("backlinks RPC finds shared concept", x.ok && x.r.rowCount === 1 && x.r.rows[0].shared_terms.includes("RLS"), x.e?.message);

// 본문 수정 → 리뷰 무효화
x = await as("yeji", "update articles set body_md = body_md || ' 수정.' where id=$1", [aid]);
st = await c.query("select peer_reviewed, (select count(*)::int from peer_reviews where article_id=$1) n from articles where id=$1", [aid]);
check("body edit invalidates reviews", x.ok && st.rows[0].peer_reviewed === false && st.rows[0].n === 0);

// 주석 · 토론
x = await as("seo", "insert into annotations (article_id, sentence_id, start_offset, end_offset, quote, author_id) values ($1,'s-abc',0,3,'첫 문',$2) returning id", [aid, ids.seo]);
check("member annotates sentence", x.ok, x.e?.message);
const ann = x.r?.rows[0].id;
x = await as("seo", "insert into annotations (article_id, sentence_id, start_offset, end_offset, quote, author_id) values ($1,'s-abc',3,1,'bad',$2)", [aid, ids.seo]);
check("invalid offsets rejected", !x.ok);
x = await as("outsider", "insert into annotation_replies (annotation_id, body, author_id) values ($1,'hi',$2)", [ann, ids.outsider]);
check("non-member cannot reply", !x.ok);
x = await as("han", "insert into annotation_replies (annotation_id, body, author_id) values ($1,'근거?',$2)", [ann, ids.han]);
check("member replies", x.ok, x.e?.message);

x = await as("yeji", "insert into debate_topics (title, created_by) values ('토론', $1) returning id", [ids.yeji]);
const tid = x.r.rows[0].id;
x = await as("lee", "insert into debate_comments (topic_id, body, lens, author_id) values ($1,'루트','chem',$2) returning id", [tid, ids.lee]);
const root = x.r.rows[0].id;
x = await as("seo", "insert into debate_comments (topic_id, parent_id, body, author_id) values ($1,$2,'대댓글',$3)", [tid, root, ids.seo]);
check("nested reply", x.ok, x.e?.message);
x = await as("seo", "update debate_comments set deleted_at = now() where id=$1 returning id", [root]);
check("cannot soft-delete others' comment", x.ok && x.r.rowCount === 0);

// 프로필
x = await as("yeji", "update profiles set bio = 'USYD' where id=$1 returning bio", [ids.yeji]);
check("member edits own profile", x.ok && x.r.rows[0].bio === "USYD", x.e?.message);
x = await as("yeji", "update profiles set is_member = false where id=$1", [ids.yeji]);
check("cannot change own membership", !x.ok, x.e?.message);
x = await as("yeji", "update profiles set bio = 'x' where id=$1 returning id", [ids.lee]);
check("cannot edit others' profile", x.ok && x.r.rowCount === 0);

const oh = (await c.query("select handle from profiles where id=$1", [ids.outsider])).rows[0].handle;
const yhOf = async () => (await c.query("select handle from profiles where id=$1", [ids.yeji])).rows[0].handle;
check("default handle hides email", /^user-[0-9a-f]{8}$/.test(oh), oh);
// 멤버 핸들: 이름소문자-성이니셜, 직접 변경 불가
x = await as("yeji", "update profiles set display_name = 'Yeji C.' where id=$1 returning handle", [ids.yeji]);
check("member handle follows name", x.ok && x.r.rows[0].handle === "yeji-c", x.e?.message ?? x.r?.rows[0]?.handle);
x = await as("yeji", "update profiles set handle = 'boss' where id=$1", [ids.yeji]);
check("handle not editable", !x.ok, x.e?.message);
await c.query("update profiles set display_name = 'H' where id=$1", [ids.han]);
const hh = (await c.query("select handle from profiles where id=$1", [ids.han])).rows[0].handle;
check("single-letter name handle", hh === "h", hh);
await c.query("update profiles set display_name = 'Yeji Cho' where id=$1", [ids.lee]);
const lh = (await c.query("select handle from profiles where id=$1", [ids.lee])).rows[0].handle;
check("handle collision gets suffix", lh === "yeji-c-2", lh);
await c.query("update profiles set display_name = 'lee' where id=$1", [ids.lee]);
x = await as("anon", "select count(*)::int n from profiles");
check("anon sees member profiles only", x.ok && x.r.rows[0].n === 4, `n=${x.r?.rows[0].n}`);
x = await as("outsider", "select count(*)::int n from profiles where id = $1", [ids.outsider]);
check("non-member sees own profile", x.ok && x.r.rows[0].n === 1);
x = await as("yeji", "update articles set tags = array_fill('t'::text, array[20]) where id=$1", [aid]);
check("tag count capped", !x.ok);
x = await as("anon", "select * from public_contributions($1)", [await yhOf()]);
check("public_contributions RPC", x.ok && x.r.rows[0].articles === 1, JSON.stringify(x.r?.rows[0] ?? x.e?.message));

// 캔버스
x = await as("han", "insert into canvases (title, owner_id) values ('c', $1) returning id", [ids.han]);
check("member creates canvas", x.ok, x.e?.message);
x = await as("outsider", "select count(*)::int n from canvases");
check("non-member cannot see canvases", x.ok && x.r.rows[0].n === 0);

// 컬럼 권한 (005)
x = await as("lee", "update annotations set author_id = $1", [ids.lee]);
check("annotation author not reassignable", !x.ok, x.e?.message);
x = await as("lee", "update annotations set resolved = true returning id");
check("member resolves annotation", x.ok && x.r.rowCount >= 1, x.e?.message);
x = await as("han", "update canvases set owner_id = $1", [ids.han]);
check("canvas owner not reassignable", !x.ok, x.e?.message);
x = await as("anon", "insert into annotations (article_id, sentence_id, start_offset, end_offset, quote) values ($1,'s',0,1,'q')", [aid]);
check("anon cannot write", !x.ok, x.e?.message);
x = await as("lee", "insert into article_authors (article_id, profile_id) values ($1,$2) on conflict (article_id, profile_id) do update set contribution = 'x'", [aid, ids.lee]);
check("coauthor upsert by non-coauthor denied", !x.ok || x.r.rowCount === 0, x.e?.message);

// 휴지통 (007)
const a3 = (await as("yeji", "insert into articles (slug, title, discipline, author_id) values ('t3','T3','englit',$1) returning id", [ids.yeji])).r.rows[0].id;
x = await as("lee", "update articles set deleted_at = now() where id=$1 returning id", [aid]);
check("non-coauthor cannot trash", x.ok && x.r.rowCount === 0);
x = await as("yeji", "update articles set deleted_at = now() where id=$1 returning is_public", [aid]);
check("trash unpublishes", x.ok && x.r.rows[0]?.is_public === false, x.e?.message);
x = await as("anon", "select count(*)::int n from articles where id=$1", [aid]);
check("anon cannot see trashed", x.ok && x.r.rows[0].n === 0);
x = await as("yeji", "update articles set is_public = true where id=$1", [aid]);
check("cannot publish trashed", !x.ok, x.e?.message);
x = await as("yeji", "update articles set deleted_at = null where id=$1 returning id", [aid]);
check("restore from trash", x.ok && x.r.rowCount === 1, x.e?.message);
x = await as("yeji", "delete from articles where id=$1 and deleted_at is not null returning id", [a3]);
check("purge skips non-trashed", x.ok && x.r.rowCount === 0);
await as("yeji", "update articles set deleted_at = now() where id=$1", [a3]);
x = await as("lee", "delete from articles where id=$1 returning id", [a3]);
check("only author purges", x.ok && x.r.rowCount === 0);
x = await as("yeji", "delete from articles where id=$1 returning id", [a3]);
check("author purges", x.ok && x.r.rowCount === 1, x.e?.message);
x = await as("han", "insert into debate_topics (title, created_by) values ('t', $1) returning id", [ids.han]);
const tp = x.r.rows[0].id;
x = await as("lee", "update debate_topics set deleted_at = now() where id=$1 returning id", [tp]);
check("only creator trashes topic", x.ok && x.r.rowCount === 0);

// 자유 분야 (006)
x = await as("yeji", "insert into articles (slug, title, discipline, author_id) values ('t4','T4','Philosophy',$1) returning discipline", [ids.yeji]);
check("custom field allowed", x.ok && x.r.rows[0].discipline === "Philosophy", x.e?.message);
x = await as("yeji", "insert into articles (slug, title, discipline, author_id) values ('t5','T5',repeat('x', 41),$1)", [ids.yeji]);
check("field length capped", !x.ok);
x = await as("lee", "update articles set author_id = $1 where id = $2", [ids.lee, aid]);
check("author not reassignable", !x.ok);

// 조회 · 좋아요 · 하이라이트 (009)
const V = "11111111-2222-3333-4444-555555555555";
let before = (await c.query("select updated_at from articles where id=$1", [aid])).rows[0].updated_at;
await approve("yeji"); await approve("lee");
await as("yeji", "update articles set is_public = true where id=$1", [aid]);
before = (await c.query("select updated_at from articles where id=$1", [aid])).rows[0].updated_at;
x = await as("anon", "select track_view($1, $2) n", [aid, V]);
check("anon view counted", x.ok && x.r.rows[0].n === 1, x.e?.message ?? JSON.stringify(x.r?.rows));
x = await as("anon", "select track_view($1, $2) n", [aid, V]);
check("same visitor same day counted once", x.ok && x.r.rows[0].n === 1);
const after = (await c.query("select updated_at from articles where id=$1", [aid])).rows[0].updated_at;
check("view keeps updated_at", String(before) === String(after));
x = await as("anon", "select * from toggle_like($1, $2)", [aid, V]);
check("like on", x.ok && x.r.rows[0].liked === true && x.r.rows[0].likes === 1, x.e?.message);
x = await as("anon", "select * from toggle_like($1, $2)", [aid, V]);
check("like off", x.ok && x.r.rows[0].liked === false && x.r.rows[0].likes === 0);
x = await as("anon", "select track_view($1, 'not-a-uuid') n", [aid]);
check("bad visitor ignored", x.ok && x.r.rows[0].n === null);
x = await as("anon", "select count(*) from article_views");
check("raw views hidden", !x.ok);
x = await as("anon", "update articles set view_count = 999 where id=$1", [aid]);
check("counter not client-writable", !x.ok || x.r.rowCount === 0);
x = await as("anon", "select popularity from articles where id=$1", [aid]);
check("popularity readable", x.ok && x.r.rows[0].popularity === 1);

const a6 = (await as("yeji", "insert into articles (slug, title, discipline, author_id) values ('t6','T6','cs',$1) returning id", [ids.yeji])).r.rows[0].id;
await as("yeji", "update articles set is_public = true where id=$1", [a6]);
x = await as("lee", "insert into profile_pins (profile_id, article_id, position) values ($1,$2,1)", [ids.lee, a6]);
check("unreviewed article not pinnable", !x.ok);
x = await as("anon", "select count(*)::int n from articles where id=$1", [a6]);
check("unreviewed published visible", x.ok && x.r.rows[0].n === 1);
x = await as("lee", "insert into profile_pins (profile_id, article_id, position) values ($1,$2,1)", [ids.lee, aid]);
check("member pins public article", x.ok, x.e?.message);
x = await as("lee", "insert into profile_pins (profile_id, article_id, position) values ($1,$2,4)", [ids.lee, aid]);
check("max 3 pins", !x.ok);
x = await as("lee", "insert into profile_pins (profile_id, article_id, position) values ($1,$2,2)", [ids.yeji, aid]);
check("cannot pin for others", !x.ok);
x = await as("outsider", "insert into profile_pins (profile_id, article_id, position) values ($1,$2,1)", [ids.outsider, aid]);
check("non-member cannot pin", !x.ok);
x = await as("anon", "select count(*)::int n from profile_pins");
check("anon reads pins", x.ok && x.r.rows[0].n === 1);

// 영문판 · 서체 · 개인 기본값 (010 · 011)
x = await as("yeji", "update articles set title_en = 'EN', body_en = 'Hello.', style = '{\"font\":\"inter\"}' where id=$1 returning style", [a6]);
check("author edits English version + style", x.ok && x.r.rows[0].style.font === "inter", x.e?.message);
x = await as("lee", "update articles set body_en = 'hijack' where id=$1 returning id", [a6]);
check("non-coauthor cannot edit English version", x.ok && x.r.rowCount === 0);
x = await as("lee", "update profiles set prefs = '{\"size\":\"l\"}' where id=$1 returning prefs", [ids.lee]);
check("member saves own prefs", x.ok && x.r.rows[0].prefs.size === "l", x.e?.message);
x = await as("lee", "update profiles set prefs = '{}' where id=$1 returning id", [ids.yeji]);
check("cannot edit others' prefs", x.ok && x.r.rowCount === 0);

// 구독 · 방문 통계 (012): 서버 전용
// 가입 신청: 서버 전용
x = await as("anon", "insert into member_requests (email, name) values ('new@uni.edu', 'New')");
check("anon cannot write member_requests", !x.ok);
x = await as("yeji", "select count(*) from member_requests");
check("member cannot read member_requests", !x.ok);
x = await as("service", "insert into member_requests (email, name) values ('New@Uni.edu', 'New') returning token");
check("service can insert member request", x.ok);
x = await as("service", "insert into member_requests (email, name) values ('new@uni.edu', 'Again')");
check("one pending request per email", !x.ok);
x = await as("service", "insert into member_requests (email, name) values ('bad', 'X')");
check("request email checked", !x.ok);
x = await as("service", "insert into member_requests (email, name, status) values ('z@uni.edu', '', 'pending')");
check("request name required", !x.ok);

x = await as("anon", "insert into subscribers (email) values ('a@b.co')");
check("anon cannot write subscribers", !x.ok);
x = await as("yeji", "select count(*) from subscribers");
check("member cannot read subscribers directly", !x.ok);
x = await as("anon", "insert into site_visits (path, visitor) values ('/', repeat('a', 64))");
check("anon cannot write visits", !x.ok);
x = await as("anon", "select site_stats(30)");
check("anon cannot read stats", !x.ok);
x = await as("yeji", "select site_stats(30)");
check("member session cannot call stats RPC", !x.ok);
x = await as("service", "insert into subscribers (email) values ('Reader@Mail.com') returning token");
check("server adds subscriber", x.ok, x.e?.message);
x = await as("service", "insert into subscribers (email) values ('reader@mail.com')");
check("subscriber email unique (case-insensitive)", !x.ok);
x = await as("service", "insert into subscribers (email) values ('not-an-email')");
check("subscriber email validated", !x.ok);
await as("service", "update subscribers set confirmed_at = now()");
await as("service", "insert into site_visits (path, ref_host, country, device, visitor) values ('/', 'google.com', 'AU', 'mobile', repeat('a', 64)), ('/members', null, 'KR', 'desktop', repeat('b', 64)), ('/', null, 'KR', 'desktop', repeat('b', 64))");
x = await as("service", "select site_stats(30) s");
const stats = x.ok ? x.r.rows[0].s : {};
check("stats aggregate", x.ok && stats.visitors === 2 && stats.views === 3 && stats.subscribers === 1 && stats.pages[0].k === "/" && stats.refs.length === 2, x.e?.message ?? JSON.stringify(stats).slice(0, 200));
x = await as("service", "insert into site_visits (path, visitor, device) values ('/', repeat('c', 64), 'phone')");
check("visit device validated", !x.ok);

// 연재 · 정기간행
x = await as("outsider", "insert into series (slug, title) values ('no','no')");
check("non-member cannot create series", !x.ok);
x = await as("yeji", "insert into series (slug, title, kind, cadence) values ('star-notes','별 노트','serial','monthly') returning id, created_by");
check("member creates series", x.ok && x.r.rows[0].created_by === ids.yeji, x.e?.message);
const sid = x.r?.rows[0].id;
x = await as("yeji", "insert into series (slug, title, created_by) values ('spoof','spoof',$1)", [ids.lee]);
check("cannot create series as someone else", !x.ok);
x = await as("yeji", "insert into series (slug, title, kind) values ('bad','bad','weird')");
check("series kind validated", !x.ok);
x = await as("anon", "select count(*)::int n from series");
check("empty series hidden from public", x.ok && x.r.rows[0].n === 0);
x = await as("lee", "select count(*)::int n from series");
check("members see empty series", x.ok && x.r.rows[0].n === 1);
x = await as("lee", "update series set title = 'hijack' where id = $1 returning id", [sid]);
check("other member cannot edit series", x.ok && x.r.rowCount === 0);
x = await as("lee", "delete from series where id = $1 returning id", [sid]);
check("other member cannot delete series", x.ok && x.r.rowCount === 0);
x = await as("yeji", "update series set created_by = $2 where id = $1", [sid, ids.lee]);
check("series owner not client-writable", !x.ok);
x = await as("yeji", "update articles set series_id = $2, series_no = 1 where id = $1 returning series_no", [aid, sid]);
check("author assigns episode", x.ok && x.r.rows[0]?.series_no === 1, x.e?.message);
x = await as("anon", "select title from series where id = $1", [sid]);
check("series with public episode is public", x.ok && x.r.rowCount === 1);
x = await as("anon", "update series set title = 'x' where id = $1", [sid]);
check("anon cannot edit series", !x.ok || x.r.rowCount === 0);
x = await as("yeji", "update articles set series_no = 0 where id = $1", [aid]);
check("episode number validated", !x.ok);
x = await as("yeji", "delete from series where id = $1 returning id", [sid]);
st = await c.query("select series_id from articles where id = $1", [aid]);
check("deleting series keeps articles", x.ok && x.r.rowCount === 1 && st.rows[0].series_id === null, x.e?.message);

// ─── 한 프로필 · 여러 계정 ───
const sec = (await c.query("insert into auth.users (email) values ('yeji2@uni.edu') returning id")).rows[0].id;
ids.second = sec;
x = await as("second", "insert into profile_logins (user_id, profile_id) values ($1, $2)", [sec, ids.lee]);
check("second account requests link", x.ok, x.e?.message);
x = await as("lee", "select email from profile_logins where user_id = $1", [sec]);
check("owner sees requester email", x.ok && x.r.rows[0]?.email === "yeji2@uni.edu", x.e?.message);
x = await as("yeji", "select count(*)::int n from profile_logins");
check("others cannot see link requests", x.ok && x.r.rows[0].n === 0);
x = await as("second", "select count(*)::int n from articles where author_id = $1", [ids.lee]);
check("pending link grants nothing", x.ok && x.r.rows[0].n === 0);
x = await as("second", "update profile_logins set status='approved', decided_by=$2, decided_at=now() where user_id=$1", [sec, ids.lee]);
check("requester cannot self-approve", !x.ok || x.r.rowCount === 0);
x = await as("yeji", "update profile_logins set status='approved', decided_by=$2, decided_at=now() where user_id=$1", [sec, ids.yeji]);
check("other profile cannot approve", !x.ok || x.r.rowCount === 0);
x = await as("lee", "update profile_logins set status='approved', decided_by=$2, decided_at=now() where user_id=$1 returning status", [sec, ids.lee]);
check("profile owner approves", x.ok && x.r.rowCount === 1, x.e?.message);
x = await as("second", "select public.me() m, public.is_member() im");
check("approved account acts as profile", x.ok && x.r.rows[0].m === ids.lee && x.r.rows[0].im === true, x.e?.message);
x = await as("second", "insert into canvases (title) values ('shared') returning owner_id");
check("insert default uses shared profile", x.ok && x.r.rows[0].owner_id === ids.lee, x.e?.message);
x = await as("second", "update profiles set bio = 'shared' where id=$1 returning id", [ids.lee]);
check("approved account edits shared profile", x.ok && x.r.rowCount === 1, x.e?.message);
x = await as("lee", "insert into profile_logins (user_id, profile_id) values ($1, $2)", [ids.lee, ids.seo]);
check("member cannot link to another profile", !x.ok, x.e?.message);
x = await as("service", "select member_email_exists('yeji2@uni.edu') ok");
check("linked email may request login link", x.ok && x.r.rows[0].ok === true, x.e?.message);
x = await as("lee", "delete from profile_logins where user_id=$1 returning user_id", [sec]);
check("profile owner can unlink", x.ok && x.r.rowCount === 1, x.e?.message);
x = await as("second", "select public.me() m");
check("unlinked account back to itself", x.ok && x.r.rows[0].m === sec);

await c.end();
const fail = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fail}/${results.length} passed`);
process.exit(fail ? 1 : 0);
