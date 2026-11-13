-- 한 프로필 · 여러 로그인 계정 (프로필 측 승인제) · 핸들 자동 지정

-- ─── 로그인 계정 연결 ────────────────────────────────
create table if not exists profile_logins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles (id) on delete set null,
  check (user_id <> profile_id)
);
create index if not exists profile_logins_profile_idx on profile_logins (profile_id);
alter table profile_logins add column if not exists email citext;

-- 요청 계정 메일: 승인할 사람이 알아볼 수 있게 (서버에서 채움)
create or replace function profile_login_email() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  new.email := (select email from auth.users where id = new.user_id);
  return new;
end $$;
drop trigger if exists profile_logins_email on profile_logins;
create trigger profile_logins_email before insert on profile_logins
for each row execute function profile_login_email();

-- 현재 계정이 쓰는 프로필 (승인된 연결 우선, 없으면 본인)
create or replace function me() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select profile_id from profile_logins where user_id = auth.uid() and status = 'approved'),
    auth.uid()
  );
$$;
grant execute on function me() to anon, authenticated, service_role;

-- 기존 정책 · 기본값: auth.uid() → me()
do $$
declare r record;
begin
  for r in
    select tablename, policyname, qual, with_check from pg_policies
     where schemaname = 'public' and tablename <> 'profile_logins'
       and (coalesce(qual, '') || coalesce(with_check, '')) like '%auth.uid()%'
  loop
    execute format('alter policy %I on public.%I%s%s', r.policyname, r.tablename,
      case when r.qual is not null then format(' using (%s)', replace(r.qual, 'auth.uid()', 'public.me()')) else '' end,
      case when r.with_check is not null then format(' with check (%s)', replace(r.with_check, 'auth.uid()', 'public.me()')) else '' end);
  end loop;
end $$;

-- 내 비멤버 기본 프로필은 계속 읽기 가능
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (is_member or id = auth.uid() or id = public.me());

alter table annotations alter column author_id set default public.me();
alter table annotation_replies alter column author_id set default public.me();
alter table debate_topics alter column created_by set default public.me();
alter table debate_comments alter column author_id set default public.me();
alter table peer_reviews alter column reviewer_id set default public.me();
alter table concepts alter column created_by set default public.me();
alter table canvases alter column owner_id set default public.me();
alter table profile_pins alter column profile_id set default public.me();
alter table series alter column created_by set default public.me();

create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_member from profiles where id = public.me()), false);
$$;

create or replace function is_coauthor(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from articles where id = a and author_id = public.me())
      or exists (select 1 from article_authors where article_id = a and profile_id = public.me());
$$;

create or replace function guard_canvas_lock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.locked is distinct from old.locked and old.owner_id is distinct from public.me() then
    raise exception 'only the owner can lock or unlock a canvas' using errcode = '42501';
  end if;
  return new;
end $$;

-- 로그인 링크: 연결 승인된 계정 메일도 허용
create or replace function member_email_exists(e text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u
      left join public.profile_logins l on l.user_id = u.id and l.status = 'approved'
      join public.profiles p on p.id = coalesce(l.profile_id, u.id)
     where lower(u.email) = lower(e) and p.is_member
  );
$$;
revoke all on function member_email_exists(text) from public, anon, authenticated;
grant execute on function member_email_exists(text) to service_role;

-- 업로드 폴더: 프로필 기준 (storage 권한 없는 환경은 건너뜀)
do $$
begin
  drop policy if exists moodboard_write on storage.objects;
  create policy moodboard_write on storage.objects for insert to authenticated
    with check (bucket_id = 'moodboard' and public.is_member() and (storage.foldername(name))[1] = public.me()::text);
  drop policy if exists media_write on storage.objects;
  create policy media_write on storage.objects for insert to authenticated
    with check (bucket_id = 'media' and public.is_member() and (storage.foldername(name))[1] = public.me()::text);
exception when insufficient_privilege then
  raise notice 'storage policies unchanged';
end $$;

-- 연결 요청 · 승인 규칙
alter table profile_logins enable row level security;
revoke all on profile_logins from anon, authenticated;
grant select, insert, delete on profile_logins to authenticated;
grant update (status, decided_at, decided_by) on profile_logins to authenticated;
grant all on profile_logins to service_role;

-- 요청한 본인 · 해당 프로필 사용자만 조회
create policy logins_read on profile_logins for select to authenticated
  using (user_id = auth.uid() or profile_id = public.me());
-- 요청: 본인 계정만 · 멤버 프로필에만 · 본인이 멤버가 아닐 때만
create policy logins_request on profile_logins for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'pending' and decided_at is null and decided_by is null
    and exists (select 1 from profiles p where p.id = profile_id and p.is_member)
    and not exists (select 1 from profiles p where p.id = auth.uid() and p.is_member)
  );
-- 승인 · 거절: 그 프로필을 이미 쓰는 다른 계정만
create policy logins_decide on profile_logins for update to authenticated
  using (profile_id = public.me() and user_id <> auth.uid())
  with check (profile_id = public.me() and status in ('approved', 'declined') and decided_by = public.me());
-- 해제: 요청자 본인 또는 프로필 측
create policy logins_remove on profile_logins for delete to authenticated
  using (user_id = auth.uid() or profile_id = public.me());

-- ─── 핸들: 이름소문자-성이니셜 (자동 · 변경 불가) ────────
alter table profiles drop constraint if exists profiles_handle_check;
alter table profiles add constraint profiles_handle_check check (handle ~ '^[a-z0-9_-]{1,32}$');

-- "Yeji C." → yeji-c · "H" → h · 영문 없으면 null
create or replace function handle_from_name(n text) returns text
language sql immutable as $$
  with w as (select regexp_split_to_array(trim(regexp_replace(lower(coalesce(n, '')), '[^a-z ]', ' ', 'g')), '\s+') a)
  select case
    when a[1] = '' then null
    when cardinality(a) > 1 then left(a[1], 28) || '-' || left(a[cardinality(a)], 1)
    else left(a[1], 32)
  end from w;
$$;

create or replace function auto_handle() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; cand text; i int := 1;
begin
  -- 비멤버: 가입 시 값 유지
  if not new.is_member then
    if tg_op = 'UPDATE' then new.handle := old.handle; end if;
    return new;
  end if;
  base := handle_from_name(new.display_name);
  if base is null then
    if tg_op = 'UPDATE' then new.handle := old.handle; end if;
    return new;
  end if;
  cand := base;
  while exists (select 1 from profiles where handle = cand::citext and id <> new.id) loop
    i := i + 1;
    cand := base || '-' || i;
  end loop;
  new.handle := cand;
  return new;
end $$;

drop trigger if exists profiles_auto_handle on profiles;
create trigger profiles_auto_handle before insert or update on profiles
for each row execute function auto_handle();

revoke update (handle) on profiles from authenticated, anon;

-- 기존 멤버 핸들 일괄 갱신
update profiles set handle = handle where is_member;
