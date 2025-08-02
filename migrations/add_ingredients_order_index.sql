-- 🎯 재료 순서 정보 저장을 위한 order_index 컬럼 추가
-- 드래그앤드롭 재료 순서 변경 기능 지원

-- ingredients 테이블에 order_index 컬럼 추가
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;

-- 기존 데이터의 order_index 설정 (현재 순서 유지)
UPDATE ingredients 
SET order_index = ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY id)
WHERE order_index IS NULL;

-- order_index에 NOT NULL 제약 조건 추가
ALTER TABLE ingredients 
ALTER COLUMN order_index SET NOT NULL;

-- 성능 최적화를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_ingredients_item_id_order 
ON ingredients(item_id, order_index);

-- 주석 추가
COMMENT ON COLUMN ingredients.order_index IS '재료 표시 순서 (1부터 시작, 드래그앤드롭 순서 변경 지원)';