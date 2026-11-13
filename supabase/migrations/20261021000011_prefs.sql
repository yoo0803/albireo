-- 멤버 개인 기본값 (서체 · 분야 · 썸네일)
alter table profiles add column if not exists prefs jsonb not null default '{}'::jsonb
  check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) < 2048);
grant update (prefs) on profiles to authenticated;
