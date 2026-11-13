-- 휴지통: 30일 지나면 자동 영구 삭제

create or replace function purge_expired_trash() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
  c int;
begin
  -- 로그인 사용자는 멤버만 (예약 작업은 auth.uid() 없음)
  if auth.uid() is not null and not is_member() then return 0; end if;
  delete from articles where deleted_at < now() - interval '30 days';
  get diagnostics c = row_count; n := n + c;
  delete from canvases where deleted_at < now() - interval '30 days';
  get diagnostics c = row_count; n := n + c;
  delete from debate_topics where deleted_at < now() - interval '30 days';
  get diagnostics c = row_count; n := n + c;
  return n;
end $$;

revoke all on function purge_expired_trash() from public, anon;
grant execute on function purge_expired_trash() to authenticated, service_role;

-- pg_cron 이 켜져 있으면 매일 새벽 정리 (없으면 휴지통을 열 때 정리)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('albireo-purge-trash', '17 3 * * *', 'select public.purge_expired_trash()');
  end if;
exception when others then null;
end $$;
