BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS cover_focal jsonb NOT NULL DEFAULT '{"x":50,"y":50}'::jsonb;
DO $ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='items_cover_focal_valid' AND conrelid='public.items'::regclass) THEN
ALTER TABLE public.items ADD CONSTRAINT items_cover_focal_valid CHECK (
  jsonb_typeof(cover_focal) = 'object'
  AND cover_focal ? 'x' AND cover_focal ? 'y'
  AND jsonb_typeof(cover_focal->'x') = 'number'
  AND jsonb_typeof(cover_focal->'y') = 'number'
  AND (cover_focal->>'x')::numeric BETWEEN 0 AND 100
  AND (cover_focal->>'y')::numeric BETWEEN 0 AND 100
);
END IF;
END $;
CREATE OR REPLACE FUNCTION public.save_recipe_atomic(p_existing_id uuid, p_item jsonb, p_ingredients jsonb, p_instructions jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_jwt_role text := coalesce(auth.jwt()->>'role', '');
  v_item_id uuid;
  v_title text := nullif(btrim(p_item->>'title'), '');
  v_servings integer := nullif(p_item->>'servings', '')::integer;
  v_cooking_time integer := nullif(p_item->>'cooking_time_minutes', '')::integer;
  v_thumbnail_index integer := coalesce(nullif(p_item->>'thumbnail_index', '')::integer, 0);
  v_creation_origin text := nullif(p_item->>'creation_origin', '');
  v_cover_focal jsonb := coalesce(p_item->'cover_focal', '{"x":50,"y":50}'::jsonb);
  v_onboarding_draft_id uuid := nullif(p_item->>'onboarding_draft_id', '')::uuid;
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
      thumbnail_index, creation_origin, cover_focal
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
      v_creation_origin,
      v_cover_focal
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
        cover_focal = case when p_item ? 'cover_focal' then v_cover_focal else cover_focal end,
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

  if v_onboarding_draft_id is not null then
    perform public.link_content_onboarding_draft(
      v_onboarding_draft_id,
      v_item_id,
      v_user_id,
      coalesce((p_item->>'is_public')::boolean, true)
    );
  end if;

  return v_item_id;
end;
$function$;
CREATE OR REPLACE VIEW public.optimized_feed_view WITH (security_invoker=true) AS
SELECT i.id,
    i.user_id,
    i.item_type,
    i.created_at,
    i.title,
    i.content,
    i.description,
    i.image_urls,
    i.thumbnail_index,
    i.tags,
    i.is_public,
    i.color_label,
    i.servings,
    i.cooking_time_minutes,
    i.recipe_id,
    i.cited_recipe_ids,
    p.public_id AS user_public_id,
    p.display_name,
    p.username,
    p.avatar_url,
    COALESCE(like_stats.likes_count, 0::bigint) AS likes_count,
    COALESCE(comment_stats.comments_count, 0::bigint) AS comments_count,
    (EXISTS ( SELECT 1
           FROM likes user_like
          WHERE user_like.user_id = auth.uid() AND user_like.item_id = i.id)) AS is_liked,
    i.creation_origin,
    COALESCE(rel.made_count, 0::bigint) AS made_count,
    COALESCE(rel.continued_count, 0::bigint) AS continued_count,
    COALESCE(rel.made_thumbs, '{}'::text[]) AS made_thumbs,
    COALESCE(ing.ingredient_count, 0::bigint) AS ingredient_count,
    COALESCE(ing.key_ingredients, '{}'::text[]) AS key_ingredients,
    i.cover_focal
   FROM items i
     LEFT JOIN profiles p ON i.user_id = p.id
     LEFT JOIN LATERAL ( SELECT count(*) AS likes_count
           FROM likes
          WHERE likes.item_id = i.id) like_stats ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS comments_count
           FROM comments
          WHERE comments.item_id = i.id AND comments.is_deleted = false) comment_stats ON true
     LEFT JOIN LATERAL ( SELECT count(DISTINCT f.user_id) FILTER (WHERE f.item_type = 'post'::item_type) AS made_count,
            count(*) FILTER (WHERE f.item_type = 'recipe'::item_type) AS continued_count,
            (array_agg(f.image_urls[1] ORDER BY cr.created_at DESC) FILTER (WHERE f.item_type = 'post'::item_type AND f.image_urls[1] IS NOT NULL))[1:3] AS made_thumbs
           FROM content_relations cr
             JOIN items f ON f.id = cr.from_item_id AND f.is_public = true AND f.user_id <> i.user_id
          WHERE cr.to_recipe_id = i.id) rel ON i.item_type = 'recipe'::item_type
     LEFT JOIN LATERAL ( SELECT count(*) AS ingredient_count,
            (array_agg(g.name ORDER BY g.order_index))[1:3] AS key_ingredients
           FROM ingredients g
          WHERE g.item_id = i.id) ing ON i.item_type = 'recipe'::item_type
  WHERE i.is_public = true
  ORDER BY i.created_at DESC;
COMMIT;
