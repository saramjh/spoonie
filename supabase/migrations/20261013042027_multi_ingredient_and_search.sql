-- Spoonie Phase32: support AND searches for several recipe ingredients.
-- Comma-delimited terms preserve multi-word names; whitespace terms work as keywords.
-- Keep the original full-phrase single-ingredient search and all other search modes.
-- No new privileges, table schema, index, or API signature changes.
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
DECLARE
  ingredient_query text := btrim(search_term);
  ingredient_terms text[];
BEGIN
  -- An explicit comma/semicolon separates full ingredient names (spaces allowed).
  -- Without separators, whitespace can also represent multiple ingredient keywords.
  -- The original full-phrase lookup is preserved for a single multiword ingredient.
  IF ingredient_query ~ '[,，、;；]' THEN
    ingredient_terms := regexp_split_to_array(ingredient_query, '[[:space:]]*[,，、;；][[:space:]]*');
  ELSE
    ingredient_terms := regexp_split_to_array(ingredient_query, '[[:space:]]+');
  END IF;

  SELECT COALESCE(array_agg(DISTINCT btrim(token)), ARRAY[]::text[])
  INTO ingredient_terms
  FROM unnest(ingredient_terms) AS terms(token)
  WHERE btrim(token) <> '';

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
      CASE WHEN ingredient_hit.matched THEN 6.0 ELSE 0.0 END +
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
  -- One boolean per item: match a whole ingredient phrase OR every distinct token.
  -- Restrict ingredient search to real Recipes, with the original RLS of ingredients.
  CROSS JOIN LATERAL (
    SELECT (
      i.item_type = 'recipe'
      AND ingredient_query <> ''
      AND (
        EXISTS (
          SELECT 1 FROM public.ingredients ing
          WHERE ing.item_id = i.id
            AND ing.name ILIKE '%' || (
              CASE WHEN cardinality(ingredient_terms) = 1
                THEN ingredient_terms[1] ELSE ingredient_query END
            ) || '%'
        )
        OR (
          cardinality(ingredient_terms) > 1
          AND NOT EXISTS (
            SELECT 1 FROM unnest(ingredient_terms) AS required(token)
            WHERE NOT EXISTS (
              SELECT 1 FROM public.ingredients ing
              WHERE ing.item_id = i.id
                AND ing.name ILIKE '%' || required.token || '%'
            )
          )
        )
      )
    ) AS matched
  ) ingredient_hit
  WHERE i.is_public = true
    AND (
      i.title ILIKE '%' || search_term || '%'
      OR i.content ILIKE '%' || search_term || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(i.tags) tag
        WHERE tag ILIKE '%' || search_term || '%'
      )
      OR ingredient_hit.matched
    )
  ORDER BY relevance_score DESC, i.created_at DESC
  LIMIT max_results;
END;
$function$;
