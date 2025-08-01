-- ==========================================
-- 🔔 알림 시스템 테이블 생성 및 관계 설정
-- ==========================================

-- 1. notifications 테이블 생성 (존재하지 않는 경우)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'admin')),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Foreign Key 제약조건 명시적 생성 (이름 지정)
-- Supabase에서 JOIN 시 참조할 수 있도록 명명된 foreign key 생성

DO $$ 
BEGIN
    -- from_user_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_from_user_id_fkey'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_from_user_id_fkey 
        FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- post_id foreign key  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_post_id_fkey'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES items(id) ON DELETE CASCADE;
    END IF;

    -- user_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_date 
ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_from_user 
ON notifications(from_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_post 
ON notifications(post_id, created_at DESC);

-- 4. 알림 타입별 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_type_date 
ON notifications(type, created_at DESC);

-- 5. Row Level Security (RLS) 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS 정책 설정
-- 📖 읽기 정책: 본인 알림만 조회 가능
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- ✏️ 수정 정책: 본인 알림만 수정 가능 (읽음 처리 등)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- ✍️ 생성 정책: 서비스 레벨에서만 알림 생성 가능
DROP POLICY IF EXISTS "Service can create notifications" ON notifications;
CREATE POLICY "Service can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 7. 알림 통계를 위한 뷰
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_count,
    COUNT(*) FILTER (WHERE type = 'like') as like_notifications,
    COUNT(*) FILTER (WHERE type = 'comment') as comment_notifications,
    COUNT(*) FILTER (WHERE type = 'follow') as follow_notifications,
    MAX(created_at) as latest_notification
FROM notifications
GROUP BY user_id;

-- 8. 알림 정리를 위한 함수 (30일 이상 된 읽은 알림 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;