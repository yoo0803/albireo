-- 캔버스 잠금 (비공개): 잠그면 만든 사람만 보고 고침

alter table canvases add column if not exists locked boolean not null default false;
grant update (locked) on canvases to authenticated;

drop policy if exists canvases_read on canvases;
create policy canvases_read on canvases for select
  using (is_member() and (not locked or owner_id = auth.uid()));

drop policy if exists canvases_update on canvases;
create policy canvases_update on canvases for update
  using (is_member() and (not locked or owner_id = auth.uid()))
  with check (is_member() and (not locked or owner_id = auth.uid()));

-- 잠금 전환은 만든 사람만
create or replace function guard_canvas_lock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.locked is distinct from old.locked and old.owner_id is distinct from auth.uid() then
    raise exception 'only the owner can lock or unlock a canvas' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists canvases_lock_guard on canvases;
create trigger canvases_lock_guard before update of locked on canvases
for each row execute function guard_canvas_lock();
