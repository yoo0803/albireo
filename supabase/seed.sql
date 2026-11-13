-- 멤버 승격 (최대 4인)
-- 실행: 각자 로그인 → profiles 의 handle(user-…) 확인 → 아래 값 교체 후 SQL Editor 실행

-- Yeji C.
update profiles set is_member = true, discipline = 'cs', display_name = 'Yeji C.' where handle = 'user-xxxxxxxx';
-- L
update profiles set is_member = true, discipline = 'englit', display_name = 'L' where handle = 'user-xxxxxxxx';
-- S
update profiles set is_member = true, discipline = 'chem', display_name = 'S' where handle = 'user-xxxxxxxx';
-- H
update profiles set is_member = true, discipline = 'klit', display_name = 'H' where handle = 'user-xxxxxxxx';
