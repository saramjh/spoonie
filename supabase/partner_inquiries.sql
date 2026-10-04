-- Partner inquiries submitted from /partners/creators and /partners/brands.
-- Server-only persistence: RLS enabled and no anon/authenticated grants or policies.

create table if not exists public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  segment text not null check (segment in ('creator', 'brand')),
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 254),
  organization text check (organization is null or char_length(organization) <= 120),
  profile_url text check (profile_url is null or char_length(profile_url) <= 500),
  message text not null check (char_length(message) between 10 and 1500),
  source_path text not null default '/partners',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_inquiries_status_created_idx
  on public.partner_inquiries (status, created_at desc);

alter table public.partner_inquiries enable row level security;

revoke all on table public.partner_inquiries from anon, authenticated;
grant select, insert, update, delete on table public.partner_inquiries to service_role;
