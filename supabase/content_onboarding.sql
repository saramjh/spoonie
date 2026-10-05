-- Account-owned initial content setup for Creator and Brand partners.
-- Public intake is account-first. Submitted sources are linked to auth.users from the start.
-- Draft Recipe creation must preserve request.user_id as the Recipe owner.

create table if not exists public.content_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_type text not null check (actor_type in ('creator', 'brand')),
  status text not null default 'submitted'
    check (status in ('submitted', 'processing', 'needs_review', 'ready', 'published', 'closed', 'failed')),
  note text check (note is null or char_length(note) <= 1000),
  rights_confirmed boolean not null default false check (rights_confirmed),
  source_path text not null check (source_path in ('/partners/creators', '/partners/brands')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_onboarding_sources (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.content_onboarding_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('instagram_post', 'instagram_reel', 'instagram_tv', 'web')),
  source_url text not null check (char_length(source_url) between 10 and 1000),
  sort_order smallint not null check (sort_order between 0 and 4),
  processing_status text not null default 'queued'
    check (processing_status in ('queued', 'fetching', 'extracting', 'validating', 'ready', 'needs_creator_input', 'unsupported', 'failed')),
  processing_error text,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, source_url)
);

alter table public.content_onboarding_sources
  add column if not exists attempt_count smallint not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_retry_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_onboarding_sources_attempt_count_check'
      and conrelid = 'public.content_onboarding_sources'::regclass
  ) then
    alter table public.content_onboarding_sources
      add constraint content_onboarding_sources_attempt_count_check
      check (attempt_count between 0 and 10);
  end if;
end
$$;

create table if not exists public.content_onboarding_drafts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.content_onboarding_requests(id) on delete cascade,
  source_id uuid not null references public.content_onboarding_sources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  status text not null default 'extracting'
    check (status in ('extracting', 'needs_input', 'private_draft', 'reviewed', 'published', 'failed')),
  recipe_data jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  unresolved_fields text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id)
);

create unique index if not exists content_onboarding_drafts_item_unique_idx
  on public.content_onboarding_drafts (item_id)
  where item_id is not null;

create index if not exists content_onboarding_drafts_user_created_idx
  on public.content_onboarding_drafts (user_id, created_at desc);

create index if not exists content_onboarding_drafts_status_created_idx
  on public.content_onboarding_drafts (status, created_at asc);

create index if not exists content_onboarding_requests_user_created_idx
  on public.content_onboarding_requests (user_id, created_at desc);

create index if not exists content_onboarding_requests_status_created_idx
  on public.content_onboarding_requests (status, created_at asc);

create index if not exists content_onboarding_sources_request_sort_idx
  on public.content_onboarding_sources (request_id, sort_order);

create index if not exists content_onboarding_sources_processing_idx
  on public.content_onboarding_sources (processing_status, next_retry_at, created_at asc);

alter table public.content_onboarding_requests enable row level security;
alter table public.content_onboarding_sources enable row level security;
alter table public.content_onboarding_drafts enable row level security;

revoke all on table public.content_onboarding_requests from anon, authenticated;
revoke all on table public.content_onboarding_sources from anon, authenticated;
revoke all on table public.content_onboarding_drafts from anon, authenticated;
grant select, insert, update, delete on table public.content_onboarding_requests to service_role;
grant select, insert, update, delete on table public.content_onboarding_sources to service_role;
grant select, insert, update, delete on table public.content_onboarding_drafts to service_role;

create or replace function public.link_content_onboarding_draft(
  p_draft_id uuid,
  p_item_id uuid,
  p_user_id uuid,
  p_is_public boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid;
begin
  if p_draft_id is null then
    return;
  end if;

  if coalesce(auth.jwt()->>'role', '') <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'onboarding draft ownership mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.items
    where id = p_item_id
      and user_id = p_user_id
      and item_type = 'recipe'::public.item_type
  ) then
    raise exception 'onboarding recipe ownership mismatch' using errcode = '42501';
  end if;

  update public.content_onboarding_drafts
  set item_id = p_item_id,
      status = case when p_is_public then 'published' else 'reviewed' end,
      unresolved_fields = '{}'::text[],
      updated_at = now()
  where id = p_draft_id
    and user_id = p_user_id
    and (item_id is null or item_id = p_item_id)
  returning request_id into v_request_id;

  if v_request_id is null then
    raise exception 'onboarding draft not found or not owned by current user' using errcode = '42501';
  end if;

  update public.content_onboarding_requests
  set status = case when p_is_public then 'published' else 'ready' end,
      updated_at = now()
  where id = v_request_id
    and user_id = p_user_id;
end;
$$;

revoke all on function public.link_content_onboarding_draft(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.link_content_onboarding_draft(uuid, uuid, uuid, boolean) to authenticated, service_role;

create or replace function public.sync_content_onboarding_publication()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid;
begin
  update public.content_onboarding_drafts
  set status = case when new.is_public then 'published' else 'reviewed' end,
      updated_at = now()
  where item_id = new.id
    and user_id = new.user_id
  returning request_id into v_request_id;

  if v_request_id is not null then
    update public.content_onboarding_requests
    set status = case when new.is_public then 'published' else 'ready' end,
        updated_at = now()
    where id = v_request_id
      and user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_content_onboarding_publication on public.items;
create trigger sync_content_onboarding_publication
after update of is_public on public.items
for each row
when (old.is_public is distinct from new.is_public)
execute function public.sync_content_onboarding_publication();

revoke all on function public.sync_content_onboarding_publication() from public, anon, authenticated;

-- The prior guest-first concierge table had no production rows when this migration was introduced.
-- Removing it prevents a second ownership model from surviving beside the account-first workflow.
drop table if exists public.creator_migration_requests;
