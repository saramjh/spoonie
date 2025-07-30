-- ==========================================
-- 🔖 북마크 시스템 구현
-- ==========================================

-- 1. 북마크 테이블 생성 (likes 테이블과 동일한 구조)
CREATE TABLE bookmarks (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 복합 기본키: 한 사용자는 하나의 아이템에 한 번만 북마크 가능
    PRIMARY KEY (user_id, item_id)
);

-- 2. 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created 
ON bookmarks(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookmarks_item_count 
ON bookmarks(item_id, created_at);

-- 3. Row Level Security (RLS) 활성화
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 설정
-- 📖 읽기 정책: 모든 북마크 조회 가능 (통계 목적)
CREATE POLICY "All users can view bookmarks" ON bookmarks
  FOR SELECT USING (true);

-- ✍️ 생성 정책: 로그인 사용자만 북마크 가능
CREATE POLICY "Authenticated users can create bookmarks" ON bookmarks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- 🗑️ 삭제 정책: 본인 북마크만 삭제 가능
CREATE POLICY "Users can delete own bookmarks" ON bookmarks
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- 5. 북마크 집계를 위한 뷰 업데이트 (기존 item_stats 뷰 확장)
CREATE OR REPLACE VIEW item_stats_with_bookmarks AS
SELECT 
    i.id as item_id,
    i.item_type,
    i.created_at,
    COALESCE(like_counts.likes_count, 0) as likes_count,
    COALESCE(comment_counts.comments_count, 0) as comments_count,
    COALESCE(bookmark_counts.bookmarks_count, 0) as bookmarks_count
FROM items i
LEFT JOIN (
    SELECT item_id, COUNT(*) as likes_count 
    FROM likes 
    GROUP BY item_id
) like_counts ON i.id = like_counts.item_id
LEFT JOIN (
    SELECT item_id, COUNT(*) as comments_count 
    FROM comments 
    WHERE is_deleted = false 
    GROUP BY item_id
) comment_counts ON i.id = comment_counts.item_id
LEFT JOIN (
    SELECT item_id, COUNT(*) as bookmarks_count 
    FROM bookmarks 
    GROUP BY item_id
) bookmark_counts ON i.id = bookmark_counts.item_id;

-- 6. 북마크 테이블 생성 완료 확인용 주석
-- 북마크 테이블이 성공적으로 생성됨

COMMENT ON TABLE bookmarks IS '사용자가 게시물/레시피를 북마크한 기록을 저장하는 테이블';
COMMENT ON COLUMN bookmarks.user_id IS '북마크한 사용자 ID';
COMMENT ON COLUMN bookmarks.item_id IS '북마크된 게시물/레시피 ID';
COMMENT ON COLUMN bookmarks.created_at IS '북마크한 시점';