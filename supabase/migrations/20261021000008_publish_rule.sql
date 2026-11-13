-- 발행 규칙: 승인 2인 · 검수 전 발행 허용(검수 대기 표시) · 휴지통 발행 차단

update app_settings set required_reviews = 2;
alter table app_settings alter column required_reviews set default 2;

-- 발행 시점 검수 여부는 작성자 선택 (peer_reviewed 로 표시 구분)
create or replace function guard_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_public and not coalesce(old.is_public, false) then
    if new.deleted_at is not null then
      raise exception 'cannot publish a trashed article' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

alter table app_settings drop column if exists require_review_to_publish;

-- 승인 인원 변경 반영
update articles a set peer_reviewed = s.ok
  from (
    select ar.id,
           coalesce((select count(*) filter (where verdict = 'approve') >= (select required_reviews from app_settings)
                        and not coalesce(bool_or(verdict = 'request_changes'), false)
                       from peer_reviews r where r.article_id = ar.id), false) as ok
      from articles ar
  ) s
 where a.id = s.id and a.peer_reviewed is distinct from s.ok;
