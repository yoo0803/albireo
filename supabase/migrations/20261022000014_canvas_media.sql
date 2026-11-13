-- 캔버스 발췌 이미지 버킷 (공개 읽기 · 멤버 업로드) · 복습 카드 자동 생성 중단

insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types') then
    update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
    where id = 'media';
  end if;
end $$;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id = 'media');
-- 자기 폴더에만 업로드
drop policy if exists media_write on storage.objects;
create policy media_write on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and is_member() and (storage.foldername(name))[1] = auth.uid()::text);

-- 복습(SRS) 기능 제거: 카드 자동 생성 트리거만 해제 (기존 데이터 보존)
drop trigger if exists concept_links_seed on concept_links;
