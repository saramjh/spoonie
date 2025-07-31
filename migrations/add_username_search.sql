-- ==========================================
-- 👤 유저네임 전용 검색 RPC 함수
-- ==========================================

-- 유저네임 검색을 위한 최적화된 RPC 함수
CREATE OR REPLACE FUNCTION search_users(
    search_term TEXT,
    max_results INTEGER DEFAULT 20,
    current_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    items_count INTEGER,
    is_following BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        COALESCE(user_stats.items_count, 0)::INTEGER as items_count,
        CASE 
            WHEN current_user_id IS NULL THEN false
            ELSE EXISTS(
                SELECT 1 FROM follows f 
                WHERE f.follower_id = current_user_id 
                AND f.following_id = p.id
            )
        END as is_following
    FROM profiles p
    LEFT JOIN (
        -- 사용자별 공개 아이템 개수 집계
        SELECT 
            user_id,
            COUNT(*)::INTEGER as items_count
        FROM items 
        WHERE is_public = true
        GROUP BY user_id
    ) user_stats ON p.id = user_stats.user_id
    WHERE 
        -- 🎯 핵심: 유저네임 또는 표시명에서만 검색
        (
            p.username ILIKE '%' || search_term || '%' OR
            p.display_name ILIKE '%' || search_term || '%'
        )
        -- 최소 1개 이상의 공개 아이템이 있는 사용자만
        AND COALESCE(user_stats.items_count, 0) > 0
    ORDER BY 
        -- 정확한 매치 우선
        CASE 
            WHEN p.username ILIKE search_term THEN 1
            WHEN p.display_name ILIKE search_term THEN 2
            WHEN p.username ILIKE search_term || '%' THEN 3
            WHEN p.display_name ILIKE search_term || '%' THEN 4
            ELSE 5
        END,
        -- 아이템 개수 내림차순
        user_stats.items_count DESC,
        -- 최신순
        p.created_at DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 성능 최적화를 위한 인덱스 (username, display_name 검색 최적화)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_search 
ON profiles USING gin(username gin_trgm_ops, display_name gin_trgm_ops);

-- trigram 확장이 없다면 일반 인덱스로 대체
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_lower 
ON profiles(LOWER(username), LOWER(display_name));

-- 공개 아이템 개수 집계를 위한 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_user_public_count 
ON items(user_id, is_public) 
WHERE is_public = true;