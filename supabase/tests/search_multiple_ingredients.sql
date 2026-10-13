-- Phase32 regression queries. Read-only; anonymous RLS and published content preserved.
DO $multi_ingredient_search$
DECLARE
  targets uuid[] := ARRAY[
    'b977ca08-c2e8-4bee-951d-841cb61fe84c'::uuid,
    '77865d19-b84a-4741-9a4b-e150c33b959d'::uuid
  ];
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.search_items_optimized('코코아 파우더 우유',20,NULL) s WHERE s.id=targets[1]) THEN
    RAISE EXCEPTION 'Multiword ingredient + another term regression';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.search_items_optimized('다진 돼지고기, 밀가루',20,NULL) s WHERE s.id=targets[2]) THEN
    RAISE EXCEPTION 'Comma-separated compound ingredient regression';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.search_items_optimized('간장 고추장',20,NULL) s WHERE s.id=targets[2]) THEN
    RAISE EXCEPTION 'Whitespace AND ingredient search regression';
  END IF;
  IF EXISTS(SELECT 1 FROM public.search_items_optimized('코코아 파우더 없는재료xyz',20,NULL) s WHERE s.id=targets[1]) THEN
    RAISE EXCEPTION 'AND search allowed a recipe missing one ingredient';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.search_items_optimized('코코아 파우더',20,NULL) s WHERE s.id=targets[1]) THEN
    RAISE EXCEPTION 'Existing single multiword ingredient search regressed';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.search_items_optimized('초코 프렌치토스트',20,NULL) s WHERE s.id=targets[1]) THEN
    RAISE EXCEPTION 'Existing title search regressed';
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.search_items_optimized('간장 고추장',200,NULL) s
    JOIN public.items i ON i.id=s.id WHERE NOT i.is_public
  ) THEN
    RAISE EXCEPTION 'Private content leaked through multi-ingredient search';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.search_items_optimized('', 200, NULL) s
    JOIN public.items i ON i.id=s.id
    WHERE abs(s.relevance_score - (
      CASE WHEN i.title ILIKE '%%' THEN 10.0 ELSE 0 END +
      CASE WHEN i.content ILIKE '%%' THEN 5.0 ELSE 0 END +
      CASE WHEN EXISTS (SELECT 1 FROM unnest(i.tags) tag WHERE tag ILIKE '%%') THEN 3.0 ELSE 0 END +
      CASE WHEN i.created_at > now() - interval '7 days' THEN 2.0
           WHEN i.created_at > now() - interval '30 days' THEN 1.0 ELSE 0 END
    )) > 0.001
  ) THEN
    RAISE EXCEPTION 'Existing empty-query ranking regressed';
  END IF;
END;
$multi_ingredient_search$;
