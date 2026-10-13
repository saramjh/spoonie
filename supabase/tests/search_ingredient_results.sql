-- Run READ ONLY against a database with normal public Recipes and registered ingredients.
-- Ingredient-only matches must appear; title and post search, no private leaks.
DO $test$
DECLARE
  match_row record;
  old_title text;
BEGIN
  SELECT i.id, ing.name, i.title INTO match_row
  FROM public.items i JOIN public.ingredients ing ON ing.item_id=i.id
  WHERE i.is_public=true AND i.item_type='recipe'
    AND length(trim(ing.name))>=3
    AND NOT COALESCE(i.title,'') ILIKE '%' || ing.name || '%'
    AND NOT COALESCE(i.content,'') ILIKE '%' || ing.name || '%'
    AND NOT EXISTS (SELECT 1 FROM unnest(i.tags) tag WHERE tag ILIKE '%' || ing.name || '%')
    AND (SELECT count(*) FROM public.search_items_optimized(ing.name,20,NULL))<20
  ORDER BY i.created_at DESC LIMIT 1;
  IF match_row.id IS NULL THEN
    RAISE EXCEPTION 'No suitable public ingredient-only fixture found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.search_items_optimized(match_row.name,20,NULL) s WHERE s.id=match_row.id
  ) THEN
    RAISE EXCEPTION 'Public ingredient-only recipe missing: %', match_row.name;
  END IF;
  SELECT title INTO old_title FROM public.items WHERE id=match_row.id;
  IF NOT EXISTS (
    SELECT 1 FROM public.search_items_optimized(old_title,20,NULL) s WHERE s.id=match_row.id
  ) THEN
    RAISE EXCEPTION 'Existing title search regressed';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.search_items_optimized('', 200, NULL) s
    JOIN public.items i ON i.id = s.id
    WHERE abs(s.relevance_score - (
      CASE WHEN i.title ILIKE '%%' THEN 10.0 ELSE 0 END +
      CASE WHEN i.content ILIKE '%%' THEN 5.0 ELSE 0 END +
      CASE WHEN EXISTS (SELECT 1 FROM unnest(i.tags) tag WHERE tag ILIKE '%%') THEN 3.0 ELSE 0 END +
      CASE WHEN i.created_at > now() - interval '7 days' THEN 2.0
           WHEN i.created_at > now() - interval '30 days' THEN 1.0 ELSE 0 END
    )) > 0.001
  ) THEN
    RAISE EXCEPTION 'Empty-query ranking must be unchanged';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.search_items_optimized(match_row.name,200,NULL) s
    JOIN public.items i ON i.id=s.id WHERE NOT i.is_public
  ) THEN
    RAISE EXCEPTION 'Private content leaked through search';
  END IF;
END;
$test$;
