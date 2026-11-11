-- Generalize the existing curated Recipe poll, preserving its row and votes.
-- Private ownership checks live in SECURITY DEFINER RPCs; raw voter records remain inaccessible.
begin;

alter table public.recipe_polls rename to item_polls;
alter table public.item_polls rename column recipe_id to item_id;
alter table public.recipe_poll_votes rename to item_poll_votes;
alter table public.item_poll_votes rename column recipe_id to item_id;
alter index if exists public.recipe_poll_votes_recipe_option_idx rename to item_poll_votes_item_option_idx;
create index if not exists item_poll_votes_user_id_idx on public.item_poll_votes(user_id);

-- Legacy service-role importer compatibility. One canonical source of data, not duplicate tables.
create view public.recipe_polls with (security_invoker = true) as
select item_id as recipe_id, question, options, active, created_at from public.item_polls;
revoke all on public.recipe_polls from public, anon, authenticated;
grant select, insert, update on public.recipe_polls to service_role;

alter table public.item_polls enable row level security;
alter table public.item_poll_votes enable row level security;
revoke all on public.item_polls from public, anon, authenticated;
revoke all on public.item_poll_votes from public, anon, authenticated;

create or replace function public.get_item_poll(p_item_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_poll public.item_polls%rowtype;
  v_counts jsonb;
  v_total bigint;
  v_selected smallint;
begin
  select p.* into v_poll
  from public.item_polls p
  join public.items i on i.id = p.item_id
  where p.item_id = p_item_id
    and i.item_type in ('recipe', 'post')
    and (i.is_public or i.user_id = auth.uid())
    and (p.active or i.user_id = auth.uid());

  if not found then return null; end if;

  select coalesce(jsonb_agg(coalesce(t.votes, 0) order by n.idx), '[]'::jsonb)
    into v_counts
  from generate_series(0, cardinality(v_poll.options) - 1) as n(idx)
  left join (
    select option_index, count(*) as votes
    from public.item_poll_votes
    where item_id = p_item_id
    group by option_index
  ) t on t.option_index = n.idx;

  select count(*) into v_total from public.item_poll_votes where item_id = p_item_id;
  if auth.uid() is not null then
    select option_index into v_selected
    from public.item_poll_votes
    where item_id = p_item_id and user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'item_id', v_poll.item_id,
    'question', v_poll.question,
    'options', to_jsonb(v_poll.options),
    'counts', v_counts,
    'total', v_total,
    'selected_index', v_selected,
    'active', v_poll.active
  );
end;
$$;

create or replace function public.cast_item_poll_vote(p_item_id uuid, p_option_index integer)
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
  if exists (
    select 1 from auth.users u
    where u.id = v_user_id and u.raw_app_meta_data ->> 'spoonie_editorial_curator' = 'true'
  ) then
    raise exception 'POLL_EDITORIAL_ACCOUNT_NOT_ELIGIBLE' using errcode = '42501';
  end if;

  -- Serialize against edits, so changing a choice list cannot reassign counted votes.
  select p.options into v_options
  from public.item_polls p
  join public.items i on i.id = p.item_id
  where p.item_id = p_item_id
    and p.active and i.is_public and i.item_type in ('recipe', 'post')
  for update of p;

  if v_options is null then
    raise exception 'POLL_NOT_AVAILABLE' using errcode = '22023';
  end if;
  if p_option_index is null or p_option_index < 0 or p_option_index >= cardinality(v_options) then
    raise exception 'POLL_INVALID_CHOICE' using errcode = '22023';
  end if;
  insert into public.item_poll_votes(item_id, user_id, option_index)
  values (p_item_id, v_user_id, p_option_index)
  on conflict (item_id, user_id) do update
  set option_index = excluded.option_index, updated_at = now();

  return public.get_item_poll(p_item_id);
end;
$$;

create or replace function public.save_item_poll(
  p_item_id uuid, p_question text, p_options text[]
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_text text;
  v_options text[];
  v_poll public.item_polls%rowtype;
  v_votes bigint;
begin
  if v_user_id is null or coalesce(auth.jwt() ->> 'is_anonymous','false') = 'true' then
    raise exception 'POLL_LOGIN_REQUIRED' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.items i
    where i.id = p_item_id and i.user_id = v_user_id and i.item_type in ('recipe','post')
  ) then
    raise exception 'POLL_OWNER_REQUIRED' using errcode = '42501';
  end if;
  select * into v_poll from public.item_polls where item_id = p_item_id for update;

  -- Null means hide (not delete) the poll; keep all historical votes untouched.
  if p_question is null and p_options is null then
    if found then
      update public.item_polls set active = false where item_id = p_item_id;
    end if;
    return null;
  end if;

  if p_question is null or p_options is null or array_ndims(p_options) <> 1
    or cardinality(p_options) not between 2 and 4 or array_position(p_options, null) is not null
    or char_length(btrim(p_question)) not between 8 and 160 then
    raise exception 'POLL_INVALID_CONTENT' using errcode = '22023';
  end if;

  v_options := array(select btrim(x) from unnest(p_options) as x);
  if exists(select 1 from unnest(v_options) x where char_length(x) not between 2 and 80)
    or (select count(distinct lower(x)) from unnest(v_options) as x) <> cardinality(v_options) then
    raise exception 'POLL_INVALID_OPTIONS' using errcode = '22023';
  end if;
  v_text := btrim(p_question);

  if v_poll.item_id is not null then
    select count(*) into v_votes from public.item_poll_votes where item_id = p_item_id;
    if v_votes > 0 and (v_poll.question <> v_text or v_poll.options <> v_options) then
      raise exception 'POLL_HAS_VOTES_OPTIONS_LOCKED' using errcode = '23514';
    end if;
    update public.item_polls set question = v_text, options = v_options, active = true
    where item_id = p_item_id;
  else
    insert into public.item_polls(item_id, question, options, active)
    values (p_item_id, v_text, v_options, true);
  end if;
  return public.get_item_poll(p_item_id);
end;
$$;

-- Keep old deployed client running until the generalized UI is live.
create or replace function public.get_recipe_poll(p_recipe_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case when j is null then null
    else j || jsonb_build_object('recipe_id', p_recipe_id)
  end
  from (select public.get_item_poll(p_recipe_id) as j) as result;
$$;

create or replace function public.cast_recipe_poll_vote(p_recipe_id uuid, p_option_index integer)
returns jsonb language sql volatile security definer set search_path = ''
as $$
  select public.cast_item_poll_vote(p_recipe_id, p_option_index)
    || jsonb_build_object('recipe_id', p_recipe_id);
$$;

revoke execute on function public.get_item_poll(uuid) from public, anon, authenticated;
revoke execute on function public.cast_item_poll_vote(uuid,integer) from public, anon, authenticated;
revoke execute on function public.save_item_poll(uuid,text,text[]) from public, anon, authenticated;
revoke execute on function public.get_recipe_poll(uuid) from public, anon, authenticated;
revoke execute on function public.cast_recipe_poll_vote(uuid,integer) from public, anon, authenticated;
grant execute on function public.get_item_poll(uuid) to anon,authenticated;
grant execute on function public.cast_item_poll_vote(uuid,integer) to authenticated;
grant execute on function public.save_item_poll(uuid,text,text[]) to authenticated;
grant execute on function public.get_recipe_poll(uuid) to anon,authenticated;
grant execute on function public.cast_recipe_poll_vote(uuid,integer) to authenticated;

commit;
