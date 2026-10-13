-- Follow-up guard: empty searches must preserve pre-ingredient-search ordering.
-- Phase31 first migration added real ingredient matching; do not boost all recipes for an empty term.
-- Phase31. Search recipe ingredient names in addition to existing title, body, and tags.
-- Keep the search RPC signature/return schema, security invoker, public-only visibility,
-- existing follower/stats projection, and existing text-match precedence unchanged.
CREATE OR REPLACE FUNCTION public.search_items_optimized(
  search_term text,
  max_results integer DEFAULT 20,
  current_user_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  item_type text,
  created_at timestamptz,
  display_name text,
  username text,
  avatar_url text,
  image_urls text[],
  likes_count integer,
  comments_count integer,
  user_id uuid,
  is_following boolean,
  relevance_score double precision
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.title,
    i.content,
    i.item_type::text,
    i.created_at,
    p.display_name::text,
    p.username::text,
    p.avatar_url::text,
    i.image_urls,
    COALESCE(stats.likes_count, 0)::integer,
    COALESCE(stats.comments_count, 0)::integer,
    i.user_id,
    CASE
      WHEN current_user_id IS NULL OR current_user_id = i.user_id THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = current_user_id AND f.following_id = i.user_id
      )
    END AS is_following,
    (
      CASE WHEN i.title ILIKE '%' || search_term || '%' THEN 10.0 ELSE 0.0 END +
      CASE WHEN i.content ILIKE '%' || search_term || '%' THEN 5.0 ELSE 0.0 END +
      -- A real Recipe ingredient hit must rank above a tag-only hit, below a title hit.
      CASE WHEN i.item_type = 'recipe' AND btrim(search_term) <> '' AND EXISTS (
        SELECT 1 FROM public.ingredients ing
        WHERE ing.item_id = i.id AND ing.name ILIKE '%' || search_term || '%'
      ) THEN 6.0 ELSE 0.0 END +
      CASE WHEN EXISTS (
        SELECT 1 FROM unnest(i.tags) tag
        WHERE tag ILIKE '%' || search_term || '%'
      ) THEN 3.0 ELSE 0.0 END +
      CASE
        WHEN i.created_at > NOW() - INTERVAL '7 days' THEN 2.0
        WHEN i.created_at > NOW() - INTERVAL '30 days' THEN 1.0
        ELSE 0.0
      END
    )::double precision AS relevance_score
  FROM public.items i
  LEFT JOIN public.profiles p ON i.user_id = p.id
  LEFT JOIN public.item_stats stats ON i.id = stats.item_id
  WHERE i.is_public = true
    AND (
      i.title ILIKE '%' || search_term || '%'
      OR i.content ILIKE '%' || search_term || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(i.tags) tag
        WHERE tag ILIKE '%' || search_term || '%'
      )
      OR (i.item_type = 'recipe' AND btrim(search_term) <> '' AND EXISTS (
        SELECT 1 FROM public.ingredients ing
        WHERE ing.item_id = i.id AND ing.name ILIKE '%' || search_term || '%'
      ))
    )
  ORDER BY relevance_score DESC, i.created_at DESC
  LIMIT max_results;
END;
$function$;
