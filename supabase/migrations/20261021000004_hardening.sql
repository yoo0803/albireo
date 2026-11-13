-- 보안 · 안정성 보강

-- 프로필: 멤버 프로필만 공개 (비멤버 가입자 노출 차단)
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (is_member or id = auth.uid());

-- 핸들: 이메일 유추 불가한 기본값
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, handle, display_name)
  values (new.id, 'user-' || substr(replace(new.id::text, '-', ''), 1, 8), 'New member');
  return new;
end $$;

-- 입력 상한
alter table articles add constraint articles_body_len check (char_length(body_md) <= 200000);
alter table articles add constraint articles_tags_len check (cardinality(tags) <= 12);
alter table articles add constraint articles_cover_https check (cover_url is null or cover_url ~ '^https://');
alter table profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 600);
alter table profiles add constraint profiles_name_len check (char_length(display_name) between 1 and 40);

-- 승인은 체크리스트 전 항목 충족 시에만
create or replace function checklist_complete(c jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(c) = 'object'
     and (select count(*) from jsonb_each(c) where value = 'true'::jsonb) >= 6
     and not exists (select 1 from jsonb_each(c) where value <> 'true'::jsonb);
$$;
alter table peer_reviews add constraint peer_reviews_approve_checklist
  check (verdict <> 'approve' or checklist_complete(checklist));

-- Storage 업로드 제한 (Supabase 컬럼 존재 시)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types') then
    update storage.buckets set file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
    where id in ('covers', 'moodboard');
  end if;
end $$;
