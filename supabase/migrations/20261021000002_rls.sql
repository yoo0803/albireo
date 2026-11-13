-- RLS 정책 · 컬럼 권한 · Realtime · Storage

alter table app_settings      enable row level security;
alter table profiles          enable row level security;
alter table articles          enable row level security;
alter table article_authors   enable row level security;
alter table annotations       enable row level security;
alter table annotation_replies enable row level security;
alter table debate_topics     enable row level security;
alter table debate_comments   enable row level security;
alter table peer_reviews      enable row level security;
alter table concepts          enable row level security;
alter table concept_links     enable row level security;
alter table srs_cards         enable row level security;
alter table canvases          enable row level security;

-- 설정: 멤버 조회만
create policy settings_read on app_settings for select using (is_member());

-- 프로필: 공개 조회, 본인 수정
create policy profiles_read on profiles for select using (true);
create policy profiles_update_self on profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated;
grant update (handle, display_name, discipline, role_title, bio, avatar_url, links) on profiles to authenticated;

-- 아티클: 공개분 또는 멤버
create policy articles_read on articles for select using (is_public or is_member());
create policy articles_insert on articles for insert with check (is_member() and author_id = auth.uid());
create policy articles_update on articles for update using (is_member() and is_coauthor(id)) with check (is_member());
create policy articles_delete on articles for delete using (author_id = auth.uid());
revoke update on articles from authenticated;
grant update (slug, title, subtitle, excerpt, body_md, cover_url, discipline, tags, status, is_public) on articles to authenticated;

create policy article_authors_read on article_authors for select
  using (is_member() or exists (select 1 from articles a where a.id = article_id and a.is_public));
create policy article_authors_write on article_authors for all
  using (is_member() and is_coauthor(article_id)) with check (is_member() and is_coauthor(article_id));

-- 주석 · 답글: 멤버 전용
create policy annotations_read on annotations for select using (is_member());
create policy annotations_insert on annotations for insert with check (is_member() and author_id = auth.uid());
create policy annotations_update on annotations for update using (is_member()) with check (is_member());
create policy annotations_delete on annotations for delete using (author_id = auth.uid());

create policy replies_read on annotation_replies for select using (is_member());
create policy replies_insert on annotation_replies for insert with check (is_member() and author_id = auth.uid());
create policy replies_delete on annotation_replies for delete using (author_id = auth.uid());

-- 토론
create policy topics_read on debate_topics for select using (is_member());
create policy topics_insert on debate_topics for insert with check (is_member() and created_by = auth.uid());
create policy topics_update on debate_topics for update using (created_by = auth.uid());

create policy comments_read on debate_comments for select using (is_member());
create policy comments_insert on debate_comments for insert with check (is_member() and author_id = auth.uid());
-- 소프트 삭제: 본인
create policy comments_update on debate_comments for update using (author_id = auth.uid()) with check (author_id = auth.uid());

-- 피어리뷰: 본인 리뷰만 작성
create policy reviews_read on peer_reviews for select using (is_member());
create policy reviews_upsert on peer_reviews for insert with check (is_member() and reviewer_id = auth.uid());
create policy reviews_update on peer_reviews for update using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy reviews_delete on peer_reviews for delete using (reviewer_id = auth.uid());

-- 개념
create policy concepts_read on concepts for select using (is_member());
create policy concepts_write on concepts for insert with check (is_member());
create policy concepts_update on concepts for update using (is_member());

create policy links_read on concept_links for select
  using (is_member() or exists (select 1 from articles a where a.id = article_id and a.is_public));
create policy links_write on concept_links for all
  using (is_member() and is_coauthor(article_id)) with check (is_member() and is_coauthor(article_id));

-- SRS: 본인 카드
create policy srs_own on srs_cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 캔버스: 멤버 조회, 소유자 수정
create policy canvases_read on canvases for select using (is_member());
create policy canvases_insert on canvases for insert with check (is_member() and owner_id = auth.uid());
create policy canvases_update on canvases for update using (is_member()) with check (is_member());
create policy canvases_delete on canvases for delete using (owner_id = auth.uid());

-- ─── Realtime ────────────────────────────────────────────
alter publication supabase_realtime add table annotations, annotation_replies, debate_comments, peer_reviews;
alter table annotations replica identity full;
alter table debate_comments replica identity full;

-- ─── Storage ─────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('covers', 'covers', true),
  ('moodboard', 'moodboard', false)
on conflict (id) do nothing;

create policy covers_read on storage.objects for select using (bucket_id = 'covers');
create policy covers_write on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and is_member());
create policy moodboard_read on storage.objects for select to authenticated
  using (bucket_id = 'moodboard' and is_member());
create policy moodboard_write on storage.objects for insert to authenticated
  with check (bucket_id = 'moodboard' and is_member() and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_delete_own on storage.objects for delete to authenticated
  using (bucket_id in ('covers', 'moodboard') and owner = auth.uid());
