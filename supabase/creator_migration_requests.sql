-- Creator migration concierge requests submitted from /partners/creators.
-- A request is explicit permission to prepare migration drafts only.
-- Nothing is published until the creator reviews and approves it.

create table if not exists public.creator_migration_requests (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 254),
  instagram_urls text[] not null check (cardinality(instagram_urls) between 1 and 5),
  note text check (note is null or char_length(note) <= 1000),
  rights_confirmed boolean not null default false check (rights_confirmed),
  source_path text not null default '/partners/creators',
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewing', 'drafts_ready', 'claimed', 'published', 'closed', 'rejected')),
  claimed_user_id uuid references auth.users(id) on delete set null,
  drafts_ready_at timestamptz,
  claimed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creator_migration_requests_status_created_idx
  on public.creator_migration_requests (status, created_at desc);

create index if not exists creator_migration_requests_email_created_idx
  on public.creator_migration_requests (lower(email), created_at desc);

alter table public.creator_migration_requests enable row level security;

revoke all on table public.creator_migration_requests from anon, authenticated;
grant select, insert, update, delete on table public.creator_migration_requests to service_role;
