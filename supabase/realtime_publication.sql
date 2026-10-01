-- Supabase Realtime에 알림과 댓글 테이블을 등록한다.
-- 클라이언트는 필터를 걸어 자기와 관련된 변경만 구독한다.
--   알림: user_id = 본인 (헤더 배지, 알림 목록 즉시 갱신)
--   댓글: item_id = 지금 보고 있는 게시물 (상세 화면을 보는 동안만)
-- 이벤트는 RLS를 통과한 행만 전달되므로 다른 사람의 알림은 받을 수 없다.
-- 여러 번 실행해도 안전하다.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end $$;
