-- 보안 보강: 관리자 표시 · 로그인 링크 요청 제한 · 멤버 메일 확인 · 백링크

-- 관리자: 이름(handle) 대신 DB 표시 (본인이 바꿀 수 없음)
alter table profiles add column if not exists is_admin boolean not null default false;
revoke update (is_admin) on profiles from authenticated, anon;
update profiles set is_admin = true where handle in ('yeji', 'yeji-c') and is_member;

-- 등록된 멤버 메일인지 (서버 전용)
create or replace function member_email_exists(e text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u join public.profiles p on p.id = u.id
     where lower(u.email) = lower(e) and p.is_member
  );
$$;
revoke all on function member_email_exists(text) from public, anon, authenticated;
grant execute on function member_email_exists(text) to service_role;

-- 로그인 링크 요청 기록 (IP 해시만 · 서버 전용)
create table if not exists login_link_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  who text not null check (char_length(who) = 64)
);
create index if not exists login_link_log_at_idx on login_link_log (who, at);
alter table login_link_log enable row level security;
revoke all on login_link_log from anon, authenticated;
grant all on login_link_log to service_role;

-- 백링크: 보이는 글(공개)이거나 멤버일 때만
create or replace function backlinks(a uuid)
returns table (id uuid, slug text, title text, shared_terms text[])
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.title, array_agg(c.term::text order by c.term)
    from concept_links mine
    join concept_links theirs on theirs.concept_id = mine.concept_id and theirs.article_id <> mine.article_id
    join articles o on o.id = theirs.article_id
    join concepts c on c.id = mine.concept_id
   where mine.article_id = a and o.deleted_at is null
     and (is_member() or (visible_article(a) and o.is_public))
   group by o.id, o.slug, o.title
   order by count(*) desc;
$$;
