-- 🆓 무료 푸시 알림 테이블 생성
-- 사용자별 푸시 구독 정보 저장

CREATE TABLE IF NOT EXISTS user_push_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL, -- 브라우저 푸시 구독 정보
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 한 사용자당 하나의 활성 구독만 허용
  UNIQUE(user_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_push_settings_user_id ON user_push_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_settings_enabled ON user_push_settings(enabled) WHERE enabled = true;

-- RLS (Row Level Security) 정책
ALTER TABLE user_push_settings ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 푸시 설정만 관리 가능
CREATE POLICY "Users can manage their own push settings" ON user_push_settings
  FOR ALL USING (auth.uid() = user_id);

-- 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_push_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거: updated_at 자동 업데이트
CREATE TRIGGER trigger_update_push_settings_updated_at
  BEFORE UPDATE ON user_push_settings
  FOR EACH ROW EXECUTE FUNCTION update_push_settings_updated_at();

-- 설명 추가
COMMENT ON TABLE user_push_settings IS '사용자별 브라우저 푸시 알림 구독 설정';
COMMENT ON COLUMN user_push_settings.subscription_data IS '브라우저에서 생성된 푸시 구독 객체 (endpoint, keys 포함)';
COMMENT ON COLUMN user_push_settings.enabled IS '푸시 알림 활성화 여부';