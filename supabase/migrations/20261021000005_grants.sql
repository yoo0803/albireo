-- 테이블 권한 명시 (기본 권한 미부여 프로젝트 대응). 행 범위는 RLS 가 담당

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- 공개 웹진 읽기
grant select on articles, article_authors, profiles, concept_links to anon;

-- 작업실
grant select on all tables in schema public to authenticated;

grant insert on articles, article_authors, annotations, annotation_replies, debate_topics,
  debate_comments, peer_reviews, concepts, concept_links, canvases to authenticated;

grant delete on articles, article_authors, annotations, annotation_replies, peer_reviews,
  concept_links, canvases to authenticated;

-- upsert 대상: 전체 컬럼
grant update on article_authors, peer_reviews, concepts to authenticated;

-- 컬럼 한정 수정 (profiles · articles 는 002)
grant update (resolved, color) on annotations to authenticated;
grant update (title, prompt) on debate_topics to authenticated;
grant update (body, deleted_at) on debate_comments to authenticated;
grant update (title, doc) on canvases to authenticated;
grant update (ease, interval_days, repetitions, due_at, last_reviewed_at) on srs_cards to authenticated;
