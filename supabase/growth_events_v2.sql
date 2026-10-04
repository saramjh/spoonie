-- 소셜 성장 루프 측정 v2.
-- 기존 events 테이블/RLS는 유지하고 허용 이벤트만 확장한다.
-- feed_impression is intentionally GA4-only in the current client logger; the DB value is reserved for a future aggregated/server path.
alter table public.events
  drop constraint if exists events_type_check;

alter table public.events
  add constraint events_type_check check (
    type in (
      'detail_open',
      'cook_start',
      'cook_complete',
      'save',
      'recipeed_create',
      'derived_create',
      'profile_open',
      'feed_impression',
      'follow',
      'unfollow',
      'share',
      'recipeed_start',
      'related_open'
    )
  );

create index if not exists events_type_created_idx
  on public.events (type, created_at desc);
