-- 조회수 · 좋아요 · 인기순 · 멤버 하이라이트

alter table articles add column if not exists view_count int not null default 0;
alter table articles add column if not exists like_count int not null default 0;
alter table articles add column if not exists popularity int generated always as (view_count + like_count * 5) stored;
create index if not exists articles_popular_idx on articles (popularity desc) where is_public;

-- 카운터 갱신은 수정일 미변경
create or replace function touch_article() returns trigger language plpgsql as $$
begin
  if (new.slug, new.title, new.subtitle, new.excerpt, new.body_md, new.cover_url, new.discipline, new.tags, new.status, new.is_public, new.deleted_at)
     is distinct from
     (old.slug, old.title, old.subtitle, old.excerpt, old.body_md, old.cover_url, old.discipline, old.tags, old.status, old.is_public, old.deleted_at) then
    new.updated_at = now();
  end if;
  return new;
end $$;
drop trigger if exists articles_touch on articles;
create trigger articles_touch before update on articles for each row execute function touch_article();

-- 방문자 기록 (익명 UUID 해시, 직접 접근 불가)
create table article_views (
  article_id uuid references articles (id) on delete cascade,
  visitor text not null,
  day date not null default current_date,
  primary key (article_id, visitor, day)
);
create table article_likes (
  article_id uuid references articles (id) on delete cascade,
  visitor text not null,
  created_at timestamptz not null default now(),
  primary key (article_id, visitor)
);
alter table article_views enable row level security;
alter table article_likes enable row level security;
revoke all on article_views, article_likes from anon, authenticated;

create or replace function visible_article(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from articles where id = a and is_public and deleted_at is null);
$$;

-- 조회: 방문자 · 일 단위 1회
create or replace function track_view(a uuid, v text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if v !~ '^[0-9a-f-]{36}$' or not visible_article(a) then return null; end if;
  insert into article_views (article_id, visitor) values (a, md5(v)) on conflict do nothing;
  if found then update articles set view_count = view_count + 1 where id = a; end if;
  select view_count into n from articles where id = a;
  return n;
end $$;

-- 좋아요 토글
create or replace function toggle_like(a uuid, v text) returns table (liked boolean, likes int)
language plpgsql security definer set search_path = public as $$
begin
  if v !~ '^[0-9a-f-]{36}$' or not visible_article(a) then return; end if;
  delete from article_likes where article_id = a and visitor = md5(v);
  if found then
    update articles set like_count = greatest(like_count - 1, 0) where id = a;
    liked := false;
  else
    insert into article_likes (article_id, visitor) values (a, md5(v));
    update articles set like_count = like_count + 1 where id = a;
    liked := true;
  end if;
  select like_count into likes from articles where id = a;
  return next;
end $$;

create or replace function like_state(a uuid, v text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from article_likes where article_id = a and visitor = md5(v));
$$;

revoke all on function track_view(uuid, text), toggle_like(uuid, text), like_state(uuid, text) from public;
grant execute on function track_view(uuid, text), toggle_like(uuid, text), like_state(uuid, text), visible_article(uuid) to anon, authenticated;

-- 하이라이트 대상: 공개 + 검수 인증
create or replace function pinnable_article(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from articles where id = a and is_public and peer_reviewed and deleted_at is null);
$$;
grant execute on function pinnable_article(uuid) to anon, authenticated;

-- 멤버 하이라이트: 최대 3개 고정
create table profile_pins (
  profile_id uuid not null references profiles (id) on delete cascade default auth.uid(),
  article_id uuid not null references articles (id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  primary key (profile_id, position),
  unique (profile_id, article_id)
);
alter table profile_pins enable row level security;
create policy pins_read on profile_pins for select using (pinnable_article(article_id) or is_member());
create policy pins_write on profile_pins for all
  using (is_member() and profile_id = auth.uid())
  with check (is_member() and profile_id = auth.uid() and pinnable_article(article_id));
grant select on profile_pins to anon, authenticated;
grant insert, update, delete on profile_pins to authenticated;
grant all on article_views, article_likes, profile_pins to service_role;
