-- 구독자 · 방문 기록 · 발행 알림 (서버 전용: service_role)

-- 구독자: 이중 확인 (확인 메일 클릭 시 confirmed_at)
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  lang text not null default 'ko' check (lang in ('ko', 'en')),
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirm_sent_at timestamptz,
  unsubscribed_at timestamptz
);
alter table subscribers enable row level security;
revoke all on subscribers from anon, authenticated;
grant all on subscribers to service_role;

-- 발행 알림 1회
alter table articles add column if not exists notified_at timestamptz;
-- 이미 공개된 글은 알림 완료로 간주
update articles set notified_at = coalesce(published_at, now()) where is_public and notified_at is null;

-- 방문 기록: 방문자 ID는 일 단위 해시만 저장
create table site_visits (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null default (now() at time zone 'Australia/Sydney')::date,
  path text not null check (char_length(path) <= 300),
  ref_host text check (char_length(ref_host) <= 120),
  country text check (char_length(country) <= 2),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  visitor text not null check (char_length(visitor) = 64)
);
create index site_visits_day_idx on site_visits (day);
alter table site_visits enable row level security;
revoke all on site_visits from anon, authenticated;
grant all on site_visits to service_role;

-- 통계 집계 (서버에서 멤버 확인 후 호출)
create or replace function site_stats(days int default 30)
returns jsonb language sql stable security definer set search_path = public as $$
  with v as (
    select * from site_visits where day > (now() at time zone 'Australia/Sydney')::date - least(greatest(days, 1), 400)
  ), today as (
    select (now() at time zone 'Australia/Sydney')::date d
  )
  select jsonb_build_object(
    'visitors', (select count(distinct visitor) from v),
    'views', (select count(*) from v),
    'today_visitors', (select count(distinct visitor) from v, today where v.day = today.d),
    'today_views', (select count(*) from v, today where v.day = today.d),
    'daily', coalesce((select jsonb_agg(x order by x->>'day') from (
        select jsonb_build_object('day', day, 'visitors', count(distinct visitor), 'views', count(*)) x from v group by day) s), '[]'),
    'pages', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('k', path, 'n', count(*), 'u', count(distinct visitor)) x from v group by path order by count(*) desc limit 12) s), '[]'),
    'refs', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('k', coalesce(ref_host, 'direct'), 'n', count(distinct visitor)) x from v group by coalesce(ref_host, 'direct') order by count(distinct visitor) desc limit 12) s), '[]'),
    'countries', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('k', coalesce(country, '??'), 'n', count(distinct visitor)) x from v group by coalesce(country, '??') order by count(distinct visitor) desc limit 10) s), '[]'),
    'devices', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('k', coalesce(device, 'desktop'), 'n', count(distinct visitor)) x from v group by coalesce(device, 'desktop') order by count(distinct visitor) desc) s), '[]'),
    'subscribers', (select count(*) from subscribers where confirmed_at is not null and unsubscribed_at is null)
  );
$$;
revoke all on function site_stats(int) from public, anon, authenticated;
grant execute on function site_stats(int) to service_role;
