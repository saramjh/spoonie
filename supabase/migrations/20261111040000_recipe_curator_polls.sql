-- Recipe taste polls: one curator question per public recipe, at most one vote per real user.
-- Editorial data is written only by the existing trusted publishing owner/service role.
-- Public RPC exposes aggregate counts, never voter identities.
create table if not exists public.recipe_polls (
  recipe_id uuid primary key references public.items(id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 8 and 160),
  options text[] not null check (array_ndims(options) = 1 and cardinality(options) between 2 and 4 and array_position(options, null) is null),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_poll_votes (
  recipe_id uuid not null references public.recipe_polls(recipe_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index smallint not null check (option_index between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);
create index if not exists recipe_poll_votes_recipe_option_idx
  on public.recipe_poll_votes(recipe_id, option_index);

alter table public.recipe_polls enable row level security;
alter table public.recipe_poll_votes enable row level security;

-- No direct client table access: public reads and votes go through narrow RPCs.
revoke all on public.recipe_polls from public, anon, authenticated;
revoke all on public.recipe_poll_votes from public, anon, authenticated;

create or replace function public.get_recipe_poll(p_recipe_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_poll public.recipe_polls%rowtype;
  v_counts jsonb;
  v_selected smallint;
  v_total bigint;
begin
  select p.* into v_poll
  from public.recipe_polls p
  join public.items i on i.id = p.recipe_id
  join auth.users author on author.id = i.user_id
  where p.recipe_id = p_recipe_id
    and p.active = true
    and i.item_type = 'recipe'
    and i.is_public = true
    and author.raw_app_meta_data ->> 'spoonie_editorial_curator' = 'true';

  if not found then return null; end if;

  select coalesce(jsonb_agg(
    (select count(*) from public.recipe_poll_votes v
       where v.recipe_id = p_recipe_id and v.option_index = idx - 1)
    order by idx
  ), '[]'::jsonb)
    into v_counts
  from generate_series(1, cardinality(v_poll.options)) idx;

  select count(*) into v_total
  from public.recipe_poll_votes where recipe_id = p_recipe_id;

  if auth.uid() is not null then
    select option_index into v_selected
    from public.recipe_poll_votes
    where recipe_id = p_recipe_id and user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'recipe_id', v_poll.recipe_id,
    'question', v_poll.question,
    'options', to_jsonb(v_poll.options),
    'counts', v_counts,
    'total', v_total,
    'selected_index', v_selected
  );
end;
$$;

create or replace function public.cast_recipe_poll_vote(p_recipe_id uuid, p_option_index integer)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_options text[];
begin
  if v_user_id is null or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'POLL_LOGIN_REQUIRED' using errcode = '28000';
  end if;

  -- Staff editorial accounts cannot artificially inflate user participation.
  if exists (
    select 1 from auth.users u where u.id = v_user_id
      and u.raw_app_meta_data ->> 'spoonie_editorial_curator' = 'true'
  ) then
    raise exception 'POLL_EDITORIAL_ACCOUNT_NOT_ELIGIBLE' using errcode = '42501';
  end if;

  select p.options into v_options
  from public.recipe_polls p
  join public.items i on i.id = p.recipe_id
  join auth.users author on author.id = i.user_id
  where p.recipe_id = p_recipe_id
    and p.active
    and i.item_type = 'recipe' and i.is_public = true
    and author.raw_app_meta_data ->> 'spoonie_editorial_curator' = 'true';

  if v_options is null then
    raise exception 'POLL_NOT_AVAILABLE' using errcode = '22023';
  end if;
  if p_option_index is null or p_option_index < 0 or p_option_index >= cardinality(v_options) then
    raise exception 'POLL_INVALID_CHOICE' using errcode = '22023';
  end if;

  insert into public.recipe_poll_votes(recipe_id, user_id, option_index)
  values (p_recipe_id, v_user_id, p_option_index)
  on conflict (recipe_id, user_id) do update set
    option_index = excluded.option_index,
    updated_at = now();

  return public.get_recipe_poll(p_recipe_id);
end;
$$;

revoke execute on function public.get_recipe_poll(uuid) from public, anon, authenticated;
revoke execute on function public.cast_recipe_poll_vote(uuid,integer) from public, anon, authenticated;
grant execute on function public.get_recipe_poll(uuid) to anon, authenticated;
grant execute on function public.cast_recipe_poll_vote(uuid,integer) to authenticated;
