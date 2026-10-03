-- 나눠서 공개하기: 미리 비공개로 올려 둔 레시피를 정해진 순서대로 하나씩 공개한다.
-- netlify/functions/release-queued-recipes.js가 하루 두 번 맨 앞 하나를 공개하고 released_at을 적는다.
-- 서버(secret key)만 쓰는 표라 RLS를 켜고 정책은 두지 않는다 (브라우저에서는 읽지도 쓰지도 못한다).

create table if not exists public.release_queue (
  item_id uuid primary key references public.items(id) on delete cascade,
  release_order integer not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists release_queue_pending_idx on public.release_queue (release_order) where released_at is null;

alter table public.release_queue enable row level security;
