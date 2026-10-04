-- Proactive acquisition state for creator/brand/community outreach.
-- Server-only: RLS enabled with no browser policies.

create table if not exists public.growth_outreach_targets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_type text not null check (target_type in ('creator', 'brand', 'media', 'community')),
  contact_channel text not null check (contact_channel in ('email', 'form', 'instagram', 'other')),
  contact_value text not null,
  source_url text,
  fit_reason text not null,
  status text not null default 'candidate'
    check (status in ('candidate', 'contacted', 'replied', 'qualified', 'declined', 'paused')),
  first_contacted_at timestamptz,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  external_thread_id text,
  external_message_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_channel, contact_value)
);

create index if not exists growth_outreach_status_followup_idx
  on public.growth_outreach_targets (status, next_follow_up_at);

alter table public.growth_outreach_targets enable row level security;

insert into public.growth_outreach_targets
  (name, target_type, contact_channel, contact_value, source_url, fit_reason, status,
   first_contacted_at, last_contacted_at, next_follow_up_at, external_thread_id, external_message_id, notes)
values
  (
    '쿠킹하루 Cooking Haru :)', 'creator', 'email', 'dnpdct202@gmail.com', null,
    '따라 하기 쉬운 대규모 레시피 콘텐츠가 Recipe → 실제 조리 Recipeed → 파생 Recipe 그래프로 확장될 가능성이 높음.',
    'contacted', now(), now(), now() + interval '7 days',
    '1a10719ef1243ca8', '1a10719ef1243ca8',
    '2026-10-04 creator pilot outreach sent. No prior sent-mail duplicate.'
  ),
  (
    '요리용디 Yori Yongd', 'creator', 'email', 'yoriyongd@gmail.com', null,
    '짧은 영상의 발견성을 구조화 Recipe와 실제 조리 기록으로 이어주는 보완 가치가 명확함.',
    'contacted', now(), now(), now() + interval '7 days',
    '1a10719f68cc7d23', '1a10719f68cc7d23',
    '2026-10-04 creator pilot outreach sent. No prior sent-mail duplicate.'
  ),
  (
    '매일맛나 delicious day', 'creator', 'email', 'imemk@naver.com', null,
    '레시피와 제품·제휴 콘텐츠가 함께 있어 Recipe 기반 조리 경험 및 제품 사용 맥락 파일럿과 적합함.',
    'contacted', now(), now(), now() + interval '7 days',
    '1a10719fe998e952', '1a10719fe998e952',
    '2026-10-04 creator pilot outreach sent. No prior sent-mail duplicate.'
  ),
  (
    '네오플램', 'brand', 'email', 'mkt@neoflam.com',
    'https://neoflamshop.co.kr/board/%EB%8C%80%EB%9F%89%EC%A0%9C%ED%9C%B4-%EB%AC%B8%EC%9D%98/1002/',
    '냄비·팬 등 반복 사용 쿡웨어를 실제 Recipe → Recipeed → 파생 조리 경험으로 연결하는 제품 사용 그래프 파일럿에 적합함.',
    'contacted', now(), now(), now() + interval '7 days',
    '1a1071bf0b368a36', '1a1071bf0b368a36',
    '2026-10-04 brand pilot outreach sent. Dedicated partnership inquiry channel verified.'
  ),
  (
    '해피콜', 'brand', 'email', 'mkt@hccompany.co.kr',
    'https://www.hcmall.co.kr/',
    '프라이팬·냄비가 Recipe 안에서 실제 사용되는 맥락이 명확하며 공식 광고/제휴 채널을 운영함.',
    'contacted', now(), now(), now() + interval '7 days',
    '1a1071de41ee1e9e', '1a1071de41ee1e9e',
    '2026-10-04 brand pilot outreach sent. No prior sent-mail duplicate.'
  ),
  (
    '사각코퍼레이션 / STENNY', 'brand', 'email', 'bkj@sagakcorp.com',
    'https://sagakcorp.com/22',
    'STENNY 주방용품을 실제 Recipe 사용 경험과 Recipeed/파생 Recipe 그래프로 연결하는 파일럿에 적합함.',
    'contacted', now(), now(), now() + interval '7 days',
    '1a1071deddaccfbb', '1a1071deddaccfbb',
    '2026-10-04 brand pilot outreach sent. No prior sent-mail duplicate.'
  )
on conflict (contact_channel, contact_value) do update set
  name = excluded.name,
  target_type = excluded.target_type,
  source_url = excluded.source_url,
  fit_reason = excluded.fit_reason,
  status = excluded.status,
  first_contacted_at = coalesce(public.growth_outreach_targets.first_contacted_at, excluded.first_contacted_at),
  last_contacted_at = excluded.last_contacted_at,
  next_follow_up_at = excluded.next_follow_up_at,
  external_thread_id = excluded.external_thread_id,
  external_message_id = excluded.external_message_id,
  notes = excluded.notes,
  updated_at = now();
