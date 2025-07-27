-- 동시성 안전성을 위한 데이터베이스 개선사항

-- 1. 좋아요 테이블 UPSERT 지원을 위한 제약조건 확인
-- 이미 (user_id, item_id) 복합 기본키가 있으므로 중복 방지됨

-- 2. 댓글 테이블에 soft delete 인덱스 추가 (성능 최적화)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_item_active 
ON comments(item_id, created_at) 
WHERE is_deleted = false;

-- 3. 좋아요 집계 성능 최적화 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_item_count 
ON likes(item_id, created_at);

-- 4. 알림 테이블 성능 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, created_at) 
WHERE is_read = false;

-- 5. 동시성 문제 모니터링을 위한 통계 뷰
CREATE OR REPLACE VIEW item_stats AS
SELECT 
    i.id as item_id,
    i.item_type,
    i.created_at,
    COALESCE(like_counts.likes_count, 0) as likes_count,
    COALESCE(comment_counts.comments_count, 0) as comments_count
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
) comment_counts ON i.id = comment_counts.item_id;

-- 6. 동시 접근 모니터링을 위한 로그 테이블 (선택사항)
CREATE TABLE IF NOT EXISTS concurrency_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type TEXT NOT NULL, -- 'like', 'comment', 'post'
    item_id UUID,
    user_id UUID,
    conflict_detected BOOLEAN DEFAULT false,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 성능 모니터링을 위한 함수
CREATE OR REPLACE FUNCTION get_high_concurrency_items(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    item_id UUID,
    item_type TEXT,
    likes_count BIGINT,
    comments_count BIGINT,
    activity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.item_id,
        s.item_type::TEXT,
        s.likes_count,
        s.comments_count,
        (s.likes_count * 1.5 + s.comments_count * 2.0) as activity_score
    FROM item_stats s
    ORDER BY activity_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql; 