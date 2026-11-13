-- 휴지통: 원고 · 캔버스 · 토론 주제 소프트 삭제

alter table articles add column if not exists deleted_at timestamptz;
alter table canvases add column if not exists deleted_at timestamptz;
alter table debate_topics add column if not exists deleted_at timestamptz;

-- 휴지통 이동 시 비공개 전환
create or replace function unpublish_on_trash() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.is_public := false;
  end if;
  return new;
end $$;
create trigger articles_unpublish_on_trash before update of deleted_at on articles
for each row execute function unpublish_on_trash();

-- 공개 읽기에서 제외
drop policy if exists articles_read on articles;
create policy articles_read on articles for select using ((is_public and deleted_at is null) or is_member());

create or replace function backlinks(a uuid)
returns table (id uuid, slug text, title text, shared_terms text[])
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.title, array_agg(c.term::text order by c.term)
    from concept_links mine
    join concept_links theirs on theirs.concept_id = mine.concept_id and theirs.article_id <> mine.article_id
    join articles o on o.id = theirs.article_id
    join concepts c on c.id = mine.concept_id
   where mine.article_id = a and o.deleted_at is null and (is_member() or o.is_public)
   group by o.id, o.slug, o.title
   order by count(*) desc;
$$;

-- 이동 · 복원 권한
grant update (deleted_at) on articles, canvases, debate_topics to authenticated;

-- 영구 삭제: 주제 작성자
grant delete on debate_topics to authenticated;
create policy topics_delete on debate_topics for delete using (is_member() and created_by = auth.uid());
