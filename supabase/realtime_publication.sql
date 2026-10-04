-- Supabase Realtime에 알림·댓글·피드 신호용 items 테이블을 등록한다.
-- 클라이언트는 필요한 행만 필터링하고, 홈 피드는 이벤트 자체를 데이터로 쓰지 않는다.
--   알림: user_id = 본인 (헤더 배지, 알림 목록 즉시 갱신)
--   댓글: item_id = 지금 보고 있는 게시물 (상세 화면을 보는 동안만)
--   피드: is_public = true INSERT/UPDATE를 홈이 보이는 동안만 받아 "새 글 보기" 신호로 사용
-- 이벤트는 RLS를 통과한 행만 전달된다.
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

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
end $$;
