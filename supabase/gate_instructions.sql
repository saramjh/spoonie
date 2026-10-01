-- 조리 단계는 로그인한 사용자에게만 보낸다 (PRODUCT.md 비로그인 공개 범위).
-- 재료는 계속 공개다. 작성자 본인은 "manage" 정책으로 비공개 레시피도 읽는다.
-- 여러 번 실행해도 안전하다.

drop policy if exists "Users can read public recipe instructions" on public.instructions;

create policy "Users can read public recipe instructions"
  on public.instructions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.items
      where items.id = instructions.item_id and items.is_public = true
    )
  );
