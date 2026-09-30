-- items 테이블에 수정 시각 컬럼과 자동 갱신 트리거를 추가한다.
-- 사이트맵이 이 값을 최종 수정일로 사용해, 검색엔진이 수정된 글을 다시 방문하게 한다.
-- Supabase 대시보드의 SQL Editor에서 실행한다. 여러 번 실행해도 안전하다.

-- 1. 컬럼이 없을 때만 추가하고, 기존 글은 작성 시각으로 채운다
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'items' and column_name = 'updated_at'
  ) then
    alter table public.items add column updated_at timestamptz;
    update public.items set updated_at = created_at;
    alter table public.items alter column updated_at set default now();
    alter table public.items alter column updated_at set not null;
  end if;
end $$;

-- 2. 글이 수정될 때마다 updated_at을 현재 시각으로 갱신
create or replace function public.set_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row
  execute function public.set_items_updated_at();
