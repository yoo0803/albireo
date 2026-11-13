-- Albireo 초기 스키마
-- 4인 워크스페이스 · 아티클 · 주석 · 토론 · 피어리뷰 · 개념 링크 · SRS · 캔버스

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ─── enum ────────────────────────────────────────────────
create type discipline as enum ('cs', 'chem', 'media', 'policy');
create type article_status as enum ('draft', 'in_review', 'approved');
create type review_verdict as enum ('approve', 'request_changes');

-- ─── 설정 ────────────────────────────────────────────────
create table app_settings (
  id boolean primary key default true check (id), -- 단일 행
  required_reviews int not null default 4 check (required_reviews between 1 and 10),
  require_review_to_publish boolean not null default true
);
insert into app_settings default values;

-- ─── 프로필 ──────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle citext unique not null check (handle ~ '^[a-z0-9_-]{2,32}$'),
  display_name text not null,
  discipline discipline,
  role_title text,
  bio text,
  avatar_url text,
  links jsonb not null default '{}'::jsonb,
  is_member boolean not null default false, -- 관리자만 변경
  created_at timestamptz not null default now()
);

-- 멤버 여부
create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_member from profiles where id = auth.uid()), false);
$$;

-- ─── 아티클 ──────────────────────────────────────────────
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9가-힣-]{1,96}$'),
  title text not null check (char_length(title) between 1 and 200),
  subtitle text,
  excerpt text,
  body_md text not null default '',
  cover_url text,
  discipline discipline not null,
  tags text[] not null default '{}',
  status article_status not null default 'draft',
  is_public boolean not null default false,
  peer_reviewed boolean not null default false, -- 트리거 전용
  published_at timestamptz,
  author_id uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(body_md, '')), 'C')
  ) stored
);
create index articles_public_idx on articles (published_at desc) where is_public;
create index articles_search_idx on articles using gin (search);

create table article_authors (
  article_id uuid references articles (id) on delete cascade,
  profile_id uuid references profiles (id) on delete cascade,
  contribution text, -- 예: '데이터 검증', '팩트 체크'
  primary key (article_id, profile_id)
);

-- 공저자 여부
create or replace function is_coauthor(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from articles where id = a and author_id = auth.uid())
      or exists (select 1 from article_authors where article_id = a and profile_id = auth.uid());
$$;

-- ─── 문장 주석 ───────────────────────────────────────────
create table annotations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles (id) on delete cascade,
  sentence_id text not null,            -- 문장 해시 id
  start_offset int not null check (start_offset >= 0),
  end_offset int not null check (end_offset > start_offset),
  quote text not null,
  color text not null default 'gold' check (color in ('gold', 'blue', 'rose', 'sage')),
  resolved boolean not null default false,
  author_id uuid not null references profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index annotations_article_idx on annotations (article_id);

create table annotation_replies (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references annotations (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  author_id uuid not null references profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ─── 교차 토론 ───────────────────────────────────────────
create table debate_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text,
  article_id uuid references articles (id) on delete set null,
  created_by uuid not null references profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table debate_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references debate_topics (id) on delete cascade,
  parent_id uuid references debate_comments (id) on delete cascade,
  lens discipline,                       -- 발언 관점
  body text not null check (char_length(body) between 1 and 5000),
  author_id uuid not null references profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index debate_comments_topic_idx on debate_comments (topic_id, created_at);

-- ─── 피어 리뷰 ───────────────────────────────────────────
create table peer_reviews (
  article_id uuid references articles (id) on delete cascade,
  reviewer_id uuid references profiles (id) on delete cascade default auth.uid(),
  verdict review_verdict not null,
  checklist jsonb not null default '{}'::jsonb, -- 가이드라인 항목별 체크
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (article_id, reviewer_id)
);

-- ─── 개념 / 양방향 링크 ──────────────────────────────────
create table concepts (
  id uuid primary key default gen_random_uuid(),
  term citext unique not null check (char_length(term) between 1 and 80),
  definition text,
  created_by uuid references profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table concept_links (
  article_id uuid references articles (id) on delete cascade,
  concept_id uuid references concepts (id) on delete cascade,
  primary key (article_id, concept_id)
);
create index concept_links_concept_idx on concept_links (concept_id);

-- ─── SRS (SM-2) ──────────────────────────────────────────
create table srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  concept_id uuid not null references concepts (id) on delete cascade,
  ease real not null default 2.5 check (ease >= 1.3),
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  unique (user_id, concept_id)
);
create index srs_cards_due_idx on srs_cards (user_id, due_at);

-- ─── 캔버스 ──────────────────────────────────────────────
create table canvases (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled canvas',
  doc jsonb not null default '{"nodes":[],"edges":[],"charts":[],"timeline":[],"moodboard":[]}'::jsonb,
  owner_id uuid not null references profiles (id) default auth.uid(),
  updated_at timestamptz not null default now(),
  check (pg_column_size(doc) < 1048576) -- 1MB 상한
);

-- ─── 트리거 ──────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger articles_touch before update on articles for each row execute function touch_updated_at();
create trigger peer_reviews_touch before update on peer_reviews for each row execute function touch_updated_at();
create trigger canvases_touch before update on canvases for each row execute function touch_updated_at();

-- 피어리뷰 집계 → 인증 마크
create or replace function recompute_peer_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a uuid := coalesce(new.article_id, old.article_id);
  need int := (select required_reviews from app_settings);
  ok int;
  blocked boolean;
begin
  select count(*) filter (where verdict = 'approve'),
         bool_or(verdict = 'request_changes')
    into ok, blocked
    from peer_reviews where article_id = a;
  update articles
     set peer_reviewed = (ok >= need and not coalesce(blocked, false)),
         status = case when ok >= need and not coalesce(blocked, false) then 'approved'::article_status
                       when status = 'approved' then 'in_review'::article_status
                       else status end
   where id = a;
  return null;
end $$;

create trigger peer_reviews_recompute after insert or update or delete on peer_reviews
for each row execute function recompute_peer_review();

-- 본문 수정 시 리뷰 무효화
create or replace function invalidate_reviews_on_edit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.body_md is distinct from old.body_md and old.peer_reviewed then
    delete from peer_reviews where article_id = new.id;
  end if;
  return new;
end $$;

create trigger articles_invalidate after update of body_md on articles
for each row execute function invalidate_reviews_on_edit();

-- 공개 전환 가드
create or replace function guard_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_public and not coalesce(old.is_public, false) then
    if (select require_review_to_publish from app_settings) and not new.peer_reviewed then
      raise exception 'peer review required before publishing' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

create trigger articles_guard_publish before insert or update of is_public on articles
for each row execute function guard_publish();

-- 개념 링크 → 멤버별 SRS 카드
create or replace function seed_srs_cards() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into srs_cards (user_id, concept_id)
  select p.id, new.concept_id from profiles p where p.is_member
  on conflict (user_id, concept_id) do nothing;
  return new;
end $$;

create trigger concept_links_seed after insert on concept_links
for each row execute function seed_srs_cards();

-- 신규 가입 → 프로필 행
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, handle, display_name)
  values (
    new.id,
    left(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_-]', '', 'g'), 24) || '-' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- ─── 공개 RPC ────────────────────────────────────────────
-- 공개 아티클 검수자 목록
create or replace function public_reviewers(a uuid)
returns table (handle citext, display_name text, discipline discipline, reviewed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.handle, p.display_name, p.discipline, r.updated_at
    from peer_reviews r join profiles p on p.id = r.reviewer_id
   where r.article_id = a and r.verdict = 'approve'
     and exists (select 1 from articles where id = a and is_public)
   order by r.updated_at;
$$;

-- 공개 기여 통계 (이력서)
create or replace function public_contributions(h text)
returns table (articles int, coauthored int, reviews int, annotations int, debate_comments int)
language sql stable security definer set search_path = public as $$
  with me as (select id from profiles where handle = h::citext and is_member)
  select
    (select count(*)::int from articles where author_id = (select id from me) and is_public),
    (select count(*)::int from article_authors aa join articles a on a.id = aa.article_id
      where aa.profile_id = (select id from me) and a.is_public),
    (select count(*)::int from peer_reviews where reviewer_id = (select id from me)),
    (select count(*)::int from annotations where author_id = (select id from me)),
    (select count(*)::int from debate_comments where author_id = (select id from me) and deleted_at is null);
$$;

-- 백링크
create or replace function backlinks(a uuid)
returns table (id uuid, slug text, title text, shared_terms text[])
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.title, array_agg(c.term::text order by c.term)
    from concept_links mine
    join concept_links theirs on theirs.concept_id = mine.concept_id and theirs.article_id <> mine.article_id
    join articles o on o.id = theirs.article_id
    join concepts c on c.id = mine.concept_id
   where mine.article_id = a and (is_member() or o.is_public)
   group by o.id, o.slug, o.title
   order by count(*) desc;
$$;
