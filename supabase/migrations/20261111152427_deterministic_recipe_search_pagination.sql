-- Retire the 3-argument overload so RPC calls using only the original
-- arguments unambiguously resolve to the new backward-compatible defaults.
-- The DDL runs atomically as a single migration transaction.
DROP FUNCTION public.search_items_optimized(text, integer, uuid);

CREATE OR REPLACE FUNCTION public.search_items_optimized(
  search_term text,
  max_results integer DEFAULT 20,
  current_user_id uuid DEFAULT NULL::uuid,
  result_offset integer DEFAULT 0,
  item_type_filter text DEFAULT NULL
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
      CASE WHEN lower(btrim(i.title)) = lower(btrim(search_term)) THEN 40.0 ELSE 0.0 END +
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
    AND (item_type_filter IS NULL OR i.item_type::text = item_type_filter)
    AND (
      i.title ILIKE '%' || search_term || '%'
      OR i.content ILIKE '%' || search_term || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(i.tags) tag
        WHERE tag ILIKE '%' || search_term || '%'
      )
      OR ingredient_hit.matched
    )
  ORDER BY relevance_score DESC, i.created_at DESC, i.id DESC
  LIMIT LEAST(GREATEST(max_results, 0), 50) OFFSET GREATEST(result_offset, 0);
END;
$function$;


-- The same recipe identity is searchable by title or author, including an owner's
-- RLS-visible private recipes. Keep a separate small query from general search:
-- general search intentionally excludes private items and searches ingredients.
CREATE OR REPLACE FUNCTION public.search_citable_recipes(
  search_term text,
  max_results integer DEFAULT 11,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  created_at timestamptz,
  item_type text,
  is_public boolean,
  image_urls text[],
  user_id uuid,
  username text,
  public_id text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT
    i.id,
    i.title,
    i.created_at,
    i.item_type::text,
    i.is_public,
    i.image_urls,
    i.user_id,
    p.username::text,
    p.public_id::text,
    p.avatar_url::text
  FROM public.items i
  LEFT JOIN public.profiles p ON p.id = i.user_id
  WHERE i.item_type = 'recipe'
    AND (
      i.title ILIKE '%' || search_term || '%'
      OR p.username ILIKE '%' || search_term || '%'
    )
  ORDER BY
    CASE
      WHEN lower(btrim(i.title)) = lower(btrim(search_term)) THEN 0
      WHEN i.title ILIKE search_term || '%' THEN 1
      WHEN i.title ILIKE '%' || search_term || '%' THEN 2
      ELSE 3
    END,
    i.created_at DESC, i.id DESC
  LIMIT LEAST(GREATEST(max_results, 0), 50) OFFSET GREATEST(result_offset, 0);
$function$;

-- Both routines execute with the caller's existing table RLS.
GRANT EXECUTE ON FUNCTION public.search_items_optimized(text,integer,uuid,integer,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_citable_recipes(text,integer,integer) TO anon, authenticated;
