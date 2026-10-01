-- 조리 단계 공개 범위.
-- 2026-10-01 처음에는 로그인 사용자 전용으로 막았다가, 같은 날 다시 공개로 되돌렸다(MCP로 적용).
-- 이유: 레시피 대체 사이트가 많아 단계를 숨기면 검색 방문자가 가입 대신 떠난다.
-- 가입은 "만들었어요"처럼 요리한 경험을 나누려 할 때 권한다. 여러 번 실행해도 안전하다.

drop policy if exists "Users can read public recipe instructions" on public.instructions;

create policy "Users can read public recipe instructions"
  on public.instructions
  for select
  using (
    exists (
      select 1 from public.items
      where items.id = instructions.item_id and items.is_public = true
    )
  );
