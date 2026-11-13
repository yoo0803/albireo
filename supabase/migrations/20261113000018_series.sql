-- 연재 · 정기간행: 시리즈와 회차

create table series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9가-힣][a-z0-9가-힣-]{0,59}$'),
  title text not null check (char_length(title) between 1 and 80),
  title_en text check (char_length(title_en) <= 80),
  blurb text check (char_length(blurb) <= 280),
  blurb_en text check (char_length(blurb_en) <= 280),
  -- serial: 연재 (이어지는 이야기) · periodical: 정기간행 (호 단위)
  kind text not null default 'serial' check (kind in ('serial', 'periodical')),
  cadence text not null default 'irregular' check (cadence in ('weekly', 'biweekly', 'monthly', 'quarterly', 'irregular')),
  status text not null default 'ongoing' check (status in ('ongoing', 'paused', 'completed')),
  created_by uuid references profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table articles add column if not exists series_id uuid references series (id) on delete set null;
alter table articles add column if not exists series_no smallint check (series_no between 1 and 999);
create index if not exists articles_series_idx on articles (series_id, series_no) where series_id is not null;

-- 공개 회차가 1편 이상인 시리즈만 외부 공개
create or replace function series_public(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from articles where series_id = s and is_public and deleted_at is null);
$$;
grant execute on function series_public(uuid) to anon, authenticated;

create or replace function touch_series() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger series_touch before update on series for each row execute function touch_series();

alter table series enable row level security;
create policy series_read on series for select using (is_member() or series_public(id));
create policy series_insert on series for insert with check (is_member() and created_by = auth.uid());
-- 수정 · 삭제: 만든 멤버 또는 관리자
create policy series_update on series for update
  using (is_member() and (created_by = auth.uid() or exists (select 1 from profiles where id = auth.uid() and is_admin)))
  with check (is_member());
create policy series_delete on series for delete
  using (is_member() and (created_by = auth.uid() or exists (select 1 from profiles where id = auth.uid() and is_admin)));

revoke all on series from anon, authenticated;
grant select on series to anon, authenticated;
grant insert (slug, title, title_en, blurb, blurb_en, kind, cadence, status) on series to authenticated;
grant update (slug, title, title_en, blurb, blurb_en, kind, cadence, status) on series to authenticated;
grant delete on series to authenticated;
grant all on series to service_role;

-- 원고에 시리즈 · 회차 지정 (기존 원고 수정 권한 그대로)
grant update (series_id, series_no) on articles to authenticated;
