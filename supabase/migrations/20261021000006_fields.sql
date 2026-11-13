-- 분야 · 관점: enum → 자유 텍스트 (기본값 cs · englit · klit · biz · chem + 기타)

drop function if exists public_reviewers(uuid);

alter table articles alter column discipline type text using
  (case discipline::text when 'media' then 'klit' when 'policy' then 'englit' else discipline::text end);
alter table profiles alter column discipline type text using
  (case discipline::text when 'media' then 'klit' when 'policy' then 'englit' else discipline::text end);
alter table debate_comments alter column lens type text using
  (case lens::text when 'media' then 'klit' when 'policy' then 'englit' else lens::text end);

drop type discipline;

-- 길이 · 제어문자 제한
alter table articles add constraint articles_discipline_chk
  check (char_length(discipline) between 1 and 40 and discipline !~ '[[:cntrl:]]');
alter table profiles add constraint profiles_discipline_chk
  check (discipline is null or (char_length(discipline) between 1 and 40 and discipline !~ '[[:cntrl:]]'));
alter table debate_comments add constraint debate_comments_lens_chk
  check (lens is null or (char_length(lens) between 1 and 40 and lens !~ '[[:cntrl:]]'));

create or replace function public_reviewers(a uuid)
returns table (handle citext, display_name text, discipline text, reviewed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.handle, p.display_name, p.discipline, r.updated_at
    from peer_reviews r join profiles p on p.id = r.reviewer_id
   where r.article_id = a and r.verdict = 'approve'
     and exists (select 1 from articles where id = a and is_public)
   order by r.updated_at;
$$;

-- 함수 실행 권한 (기본 권한 미부여 프로젝트 대응)
grant execute on function public_reviewers(uuid) to anon, authenticated;
