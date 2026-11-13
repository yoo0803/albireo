-- 스튜디오 편집권: 멤버 4인 고정

alter table app_settings add column if not exists max_members int not null default 4 check (max_members between 1 and 10);

-- 멤버 정원 초과 차단
create or replace function enforce_member_cap() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cap int := (select max_members from app_settings);
begin
  if new.is_member and not coalesce(old.is_member, false) then
    if (select count(*) from profiles where is_member and id <> new.id) >= cap then
      raise exception 'member cap (%) reached', cap using errcode = 'P0002';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_member_cap before insert or update of is_member on profiles
for each row execute function enforce_member_cap();

-- is_member 변경: service_role(관리자)만
revoke insert on profiles from authenticated, anon;
revoke update (is_member) on profiles from authenticated, anon;

-- 비멤버 쓰기 경로 차단 보강
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists comments_update on debate_comments;
create policy comments_update on debate_comments for update
  using (is_member() and author_id = auth.uid()) with check (is_member() and author_id = auth.uid());

drop policy if exists reviews_update on peer_reviews;
create policy reviews_update on peer_reviews for update
  using (is_member() and reviewer_id = auth.uid()) with check (is_member() and reviewer_id = auth.uid());

drop policy if exists reviews_delete on peer_reviews;
create policy reviews_delete on peer_reviews for delete using (is_member() and reviewer_id = auth.uid());

drop policy if exists annotations_delete on annotations;
create policy annotations_delete on annotations for delete using (is_member() and author_id = auth.uid());

drop policy if exists replies_delete on annotation_replies;
create policy replies_delete on annotation_replies for delete using (is_member() and author_id = auth.uid());

drop policy if exists topics_update on debate_topics;
create policy topics_update on debate_topics for update using (is_member() and created_by = auth.uid());

drop policy if exists articles_delete on articles;
create policy articles_delete on articles for delete using (is_member() and author_id = auth.uid());

drop policy if exists canvases_delete on canvases;
create policy canvases_delete on canvases for delete using (is_member() and owner_id = auth.uid());

drop policy if exists srs_own on srs_cards;
create policy srs_own on srs_cards for all
  using (is_member() and user_id = auth.uid()) with check (is_member() and user_id = auth.uid());
