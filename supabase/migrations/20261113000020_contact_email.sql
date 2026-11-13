-- 프로필 연락용 메일 (선택 · 공개 프로필에 표시)
alter table profiles add column if not exists contact_email text;
alter table profiles drop constraint if exists profiles_contact_email_check;
alter table profiles add constraint profiles_contact_email_check
  check (contact_email is null or (char_length(contact_email) <= 120 and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
grant update (contact_email) on profiles to authenticated;
