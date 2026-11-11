-- One PostgreSQL transaction for the content row(s) and optional poll.
-- Reuses the existing, already-vetted recipe and poll functions: no duplicate recipes SQL.
-- Invocation is intentionally auth.uid()-scoped (SECURITY INVOKER).
create or replace function public.save_item_with_poll_atomic(
  p_existing_id uuid,
  p_item jsonb,
  p_ingredients jsonb,
  p_instructions jsonb,
  p_poll jsonb,
  p_poll_action text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_id uuid;
begin
  if v_user_id is null or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'LOGIN_REQUIRED' using errcode = '42501';
  end if;
  if p_item is null or jsonb_typeof(p_item) <> 'object' then
    raise exception 'INVALID_ITEM' using errcode = '22023';
  end if;
  if p_poll_action is null or p_poll_action not in ('keep', 'set', 'disable') then
    raise exception 'INVALID_POLL_ACTION' using errcode = '22023';
  end if;

  if p_item ->> 'item_type' = 'recipe' then
    -- This function already handles the item, ingredients, instructions,
    -- author ownership, and optional onboarding link within one transaction.
    v_item_id := public.save_recipe_atomic(
      p_existing_id, p_item, p_ingredients, p_instructions
    );
  elsif p_item ->> 'item_type' = 'post' then
    if nullif(btrim(p_item ->> 'content'), '') is null then
      raise exception 'POST_CONTENT_REQUIRED' using errcode = '22023';
    end if;

    if p_existing_id is null then
      insert into public.items (
        user_id, item_type, title, content, image_urls, tags,
        cited_recipe_ids, is_public, thumbnail_index, cover_focal, creation_origin
      )
      values (
        v_user_id, 'post'::public.item_type,
        nullif(btrim(p_item ->> 'title'), ''), p_item ->> 'content',
        coalesce(array(select jsonb_array_elements_text(coalesce(p_item -> 'image_urls', '[]'::jsonb))), '{}'::text[]),
        coalesce(array(select jsonb_array_elements_text(coalesce(p_item -> 'tags', '[]'::jsonb))), '{}'::text[]),
        coalesce(array(select value::uuid from jsonb_array_elements_text(coalesce(p_item -> 'cited_recipe_ids', '[]'::jsonb)) as value), '{}'::uuid[]),
        coalesce((p_item ->> 'is_public')::boolean, true),
        coalesce((p_item ->> 'thumbnail_index')::integer, 0),
        coalesce(p_item -> 'cover_focal', '{"x":50,"y":50}'::jsonb),
        nullif(p_item ->> 'creation_origin', '')
      )
      returning id into v_item_id;
    else
      update public.items
      set title = nullif(btrim(p_item ->> 'title'), ''),
          content = p_item ->> 'content',
          image_urls = coalesce(array(select jsonb_array_elements_text(coalesce(p_item -> 'image_urls', '[]'::jsonb))), '{}'::text[]),
          tags = coalesce(array(select jsonb_array_elements_text(coalesce(p_item -> 'tags', '[]'::jsonb))), '{}'::text[]),
          cited_recipe_ids = coalesce(array(select value::uuid from jsonb_array_elements_text(coalesce(p_item -> 'cited_recipe_ids', '[]'::jsonb)) as value), '{}'::uuid[]),
          is_public = coalesce((p_item ->> 'is_public')::boolean, true),
          thumbnail_index = coalesce((p_item ->> 'thumbnail_index')::integer, 0),
          cover_focal = coalesce(p_item -> 'cover_focal', '{"x":50,"y":50}'::jsonb),
          creation_origin = case when p_item ? 'creation_origin'
            then nullif(p_item ->> 'creation_origin', '') else creation_origin end,
          updated_at = now()
      where id = p_existing_id and user_id = v_user_id
        and item_type = 'post'::public.item_type
      returning id into v_item_id;

      if v_item_id is null then
        raise exception 'POST_NOT_OWNED' using errcode = '42501';
      end if;
    end if;
  else
    raise exception 'INVALID_ITEM_TYPE' using errcode = '22023';
  end if;

  if p_poll_action = 'set' then
    if jsonb_typeof(p_poll) <> 'object' or jsonb_typeof(p_poll -> 'options') <> 'array' then
      raise exception 'INVALID_POLL' using errcode = '22023';
    end if;
    -- This already enforces authorship, input limits, and vote-locking.
    perform public.save_item_poll(
      v_item_id,
      p_poll ->> 'question',
      array(select jsonb_array_elements_text(p_poll -> 'options'))
    );
  elsif p_poll_action = 'disable' then
    perform public.save_item_poll(v_item_id, null, null);
  end if;

  -- Any error above rolls back the entire item + poll mutation.
  return v_item_id;
end;
$$;

revoke all on function public.save_item_with_poll_atomic(uuid,jsonb,jsonb,jsonb,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.save_item_with_poll_atomic(uuid,jsonb,jsonb,jsonb,jsonb,text)
  to authenticated;
