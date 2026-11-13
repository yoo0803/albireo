-- 멤버 가입 신청 (관리자 메일 승인 · 서버 전용: service_role)

create table member_requests (
  id uuid primary key default gen_random_uuid(),
  email citext not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text not null check (char_length(name) between 1 and 40),
  field text check (char_length(field) <= 40),
  note text check (char_length(note) <= 600),
  lang text not null default 'ko' check (lang in ('ko', 'en')),
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
-- 같은 메일 대기 신청 1건
create unique index member_requests_pending_email on member_requests (email) where status = 'pending';
create index member_requests_created_idx on member_requests (created_at);

alter table member_requests enable row level security;
revoke all on member_requests from anon, authenticated;
grant all on member_requests to service_role;
