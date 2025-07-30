-- 🔒 Row Level Security (RLS) 정책 구현
-- 앱 레벨 권한 체크를 DB 레벨로 이동하여 성능 향상 + 보안 강화

-- ================================
-- 1. RLS 활성화
-- ================================

-- items 테이블 RLS 활성화
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- profiles 테이블 RLS 활성화 
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- comments 테이블 RLS 활성화
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- likes 테이블 RLS 활성화
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- follows 테이블 RLS 활성화
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- notifications 테이블 RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ================================
-- 2. Items (레시피/레시피드) 정책
-- ================================

-- 📖 읽기 정책: 공개 아이템 + 본인 아이템
CREATE POLICY "Users can view public items or own items" ON items
  FOR SELECT USING (
    is_public = true OR 
    user_id = auth.uid()
  );

-- ✍️ 생성 정책: 로그인 사용자만 작성 가능
CREATE POLICY "Authenticated users can create items" ON items
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- ✏️ 수정 정책: 본인 아이템만 수정 가능
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- 🗑️ 삭제 정책: 본인 아이템만 삭제 가능
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ================================
-- 3. Profiles (프로필) 정책
-- ================================

-- 📖 읽기 정책: 모든 프로필 조회 가능 (공개 정보)
CREATE POLICY "All users can view profiles" ON profiles
  FOR SELECT USING (true);

-- ✏️ 수정 정책: 본인 프로필만 수정 가능
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    id = auth.uid()
  ) WITH CHECK (
    id = auth.uid()
  );

-- ✍️ 생성 정책: 본인 프로필만 생성 가능
CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

-- ================================
-- 4. Comments (댓글) 정책
-- ================================

-- 📖 읽기 정책: 활성 댓글은 모두 조회 가능
CREATE POLICY "All users can view active comments" ON comments
  FOR SELECT USING (
    is_deleted = false OR
    user_id = auth.uid() -- 본인 삭제된 댓글은 볼 수 있음
  );

-- ✍️ 생성 정책: 로그인 사용자만 댓글 작성 가능
CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- ✏️ 수정 정책: 본인 댓글만 수정 가능 (soft delete 포함)
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- ================================
-- 5. Likes (좋아요) 정책
-- ================================

-- 📖 읽기 정책: 모든 좋아요 조회 가능
CREATE POLICY "All users can view likes" ON likes
  FOR SELECT USING (true);

-- ✍️ 생성 정책: 로그인 사용자만 좋아요 가능
CREATE POLICY "Authenticated users can create likes" ON likes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- 🗑️ 삭제 정책: 본인 좋아요만 취소 가능
CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ================================
-- 6. Follows (팔로우) 정책
-- ================================

-- 📖 읽기 정책: 모든 팔로우 관계 조회 가능
CREATE POLICY "All users can view follows" ON follows
  FOR SELECT USING (true);

-- ✍️ 생성 정책: 로그인 사용자만 팔로우 가능
CREATE POLICY "Authenticated users can create follows" ON follows
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    follower_id = auth.uid() AND
    follower_id != following_id -- 자기 자신 팔로우 방지
  );

-- 🗑️ 삭제 정책: 본인 팔로우만 취소 가능
CREATE POLICY "Users can delete own follows" ON follows
  FOR DELETE USING (
    follower_id = auth.uid()
  );

-- ================================
-- 7. Notifications (알림) 정책
-- ================================

-- 📖 읽기 정책: 본인 알림만 조회 가능
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- ✏️ 수정 정책: 본인 알림만 수정 가능 (읽음 처리 등)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- ✍️ 생성 정책: 시스템에서만 알림 생성 (서비스 키 사용)
-- 일반 사용자는 직접 알림을 생성할 수 없음

-- ================================
-- 8. 성능 최적화 인덱스 (RLS와 함께 사용)
-- ================================

-- RLS 정책 실행을 위한 최적화 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_user_public 
ON items(user_id, is_public, created_at DESC)
WHERE is_public = true OR user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_active 
ON comments(user_id, item_id, is_deleted) 
WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_user_item 
ON likes(user_id, item_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_follower 
ON follows(follower_id, following_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read, created_at DESC);

-- ================================
-- 9. RLS 성능 모니터링
-- ================================

-- RLS 정책 실행 통계를 위한 뷰
CREATE OR REPLACE VIEW rls_performance_stats AS
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_tup_fetch as fetches,
  n_tup_returned as returned
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_tup_fetch DESC;

-- 정책별 사용량 확인 함수
CREATE OR REPLACE FUNCTION check_rls_policies()
RETURNS TABLE(
  table_name text,
  policy_name text,
  policy_type text,
  enabled boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.tablename::text,
    pol.policyname::text,
    pol.cmd::text,
    pol.permissive::boolean as enabled
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
  ORDER BY pol.tablename, pol.policyname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 