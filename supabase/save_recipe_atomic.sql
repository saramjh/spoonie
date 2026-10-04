-- 레시피 본체 + 재료 + 조리 단계를 한 트랜잭션으로 저장한다.
-- SECURITY INVOKER로 기존 RLS/사용자 권한을 그대로 적용한다.
create or replace function public.save_recipe_atomic(
  p_existing_id uuid,
  p_item jsonb,
  p_ingredients jsonb,
  p_instructions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt()->>'role', '');
  v_item_id uuid;
  v_title text := nullif(btrim(p_item->>'title'), '');
  v_servings integer := nullif(p_item->>'servings', '')::integer;
  v_cooking_time integer := nullif(p_item->>'cooking_time_minutes', '')::integer;
  v_thumbnail_index integer := coalesce(nullif(p_item->>'thumbnail_index', '')::integer, 0);
  v_creation_origin text := nullif(p_item->>'creation_origin', '');
begin
  -- 일반 사용자는 auth.uid()만 사용한다. service_role 기반 운영 importer만 p_item.user_id를 허용한다.
  if v_jwt_role = 'service_role' then
    v_user_id := nullif(p_item->>'user_id', '')::uuid;
  end if;
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if v_title is null then
    raise exception 'recipe title is required' using errcode = '22023';
  end if;
  if v_servings is null or v_servings < 1 then
    raise exception 'servings must be positive' using errcode = '22023';
  end if;
  if v_cooking_time is null or v_cooking_time < 1 then
    raise exception 'cooking time must be positive' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_ingredients, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_ingredients, '[]'::jsonb)) = 0 then
    raise exception 'at least one ingredient is required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_instructions, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_instructions, '[]'::jsonb)) = 0 then
    raise exception 'at least one instruction is required' using errcode = '22023';
  end if;

  if p_existing_id is null then
    insert into public.items (
      user_id, item_type, title, description, image_urls, tags, color_label,
      servings, cooking_time_minutes, is_public, cited_recipe_ids,
      thumbnail_index, creation_origin
    ) values (
      v_user_id,
      'recipe'::public.item_type,
      v_title,
      nullif(p_item->>'description', ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_item->'image_urls', '[]'::jsonb))), '{}'::text[]),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_item->'tags', '[]'::jsonb))), '{}'::text[]),
      nullif(p_item->>'color_label', ''),
      v_servings,
      v_cooking_time,
      coalesce((p_item->>'is_public')::boolean, true),
      coalesce(array(select value::uuid from jsonb_array_elements_text(coalesce(p_item->'cited_recipe_ids', '[]'::jsonb)) as value), '{}'::uuid[]),
      v_thumbnail_index,
      v_creation_origin
    ) returning id into v_item_id;
  else
    update public.items
    set title = v_title,
        description = nullif(p_item->>'description', ''),
        image_urls = coalesce(array(select jsonb_array_elements_text(coalesce(p_item->'image_urls', '[]'::jsonb))), '{}'::text[]),
        tags = coalesce(array(select jsonb_array_elements_text(coalesce(p_item->'tags', '[]'::jsonb))), '{}'::text[]),
        color_label = nullif(p_item->>'color_label', ''),
        servings = v_servings,
        cooking_time_minutes = v_cooking_time,
        is_public = coalesce((p_item->>'is_public')::boolean, true),
        cited_recipe_ids = coalesce(array(select value::uuid from jsonb_array_elements_text(coalesce(p_item->'cited_recipe_ids', '[]'::jsonb)) as value), '{}'::uuid[]),
        thumbnail_index = v_thumbnail_index,
        creation_origin = case when p_item ? 'creation_origin' then v_creation_origin else creation_origin end,
        updated_at = now()
    where id = p_existing_id
      and user_id = v_user_id
      and item_type = 'recipe'::public.item_type
    returning id into v_item_id;

    if v_item_id is null then
      raise exception 'recipe not found or not owned by current user' using errcode = '42501';
    end if;

    delete from public.ingredients where item_id = v_item_id;
    delete from public.instructions where item_id = v_item_id;
  end if;

  insert into public.ingredients (item_id, name, amount, unit, order_index)
  select
    v_item_id,
    nullif(btrim(x.name), ''),
    x.amount,
    nullif(x.unit, ''),
    x.order_index
  from jsonb_to_recordset(p_ingredients) as x(name text, amount numeric, unit text, order_index integer)
  where nullif(btrim(x.name), '') is not null;

  if not found then
    raise exception 'at least one valid ingredient is required' using errcode = '22023';
  end if;

  insert into public.instructions (item_id, step_number, description, image_url)
  select
    v_item_id,
    x.step_number,
    btrim(x.description),
    nullif(x.image_url, '')
  from jsonb_to_recordset(p_instructions) as x(step_number integer, description text, image_url text)
  where nullif(btrim(x.description), '') is not null;

  if not found then
    raise exception 'at least one valid instruction is required' using errcode = '22023';
  end if;

  return v_item_id;
end;
$$;

revoke all on function public.save_recipe_atomic(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_recipe_atomic(uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
