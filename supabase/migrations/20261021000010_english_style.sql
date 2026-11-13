-- 영문판 (선택) · 원고 서체 설정

alter table articles
  add column if not exists title_en text check (title_en is null or char_length(title_en) <= 200),
  add column if not exists subtitle_en text check (subtitle_en is null or char_length(subtitle_en) <= 200),
  add column if not exists excerpt_en text check (excerpt_en is null or char_length(excerpt_en) <= 200),
  add column if not exists body_en text check (body_en is null or char_length(body_en) <= 200000),
  add column if not exists style jsonb not null default '{}'::jsonb
    check (jsonb_typeof(style) = 'object' and pg_column_size(style) < 2048);

grant update (title_en, subtitle_en, excerpt_en, body_en, style) on articles to authenticated;

-- 수정일 갱신 대상에 포함
create or replace function touch_article() returns trigger language plpgsql as $$
begin
  if (new.slug, new.title, new.subtitle, new.excerpt, new.body_md, new.cover_url, new.discipline, new.tags, new.status, new.is_public, new.deleted_at,
      new.title_en, new.subtitle_en, new.excerpt_en, new.body_en, new.style)
     is distinct from
     (old.slug, old.title, old.subtitle, old.excerpt, old.body_md, old.cover_url, old.discipline, old.tags, old.status, old.is_public, old.deleted_at,
      old.title_en, old.subtitle_en, old.excerpt_en, old.body_en, old.style) then
    new.updated_at = now();
  end if;
  return new;
end $$;
