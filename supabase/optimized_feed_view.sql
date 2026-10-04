-- 홈·프로필·탐색이 읽는 공개 피드 뷰 (Supabase에 적용됨)
-- made_count/continued_count/made_thumbs: 다른 사람이 이 레시피로 만든 공개 기록 (성장 고리의 신뢰 증거)
-- ingredient_count/key_ingredients: 피드 카드의 핵심 재료 줄
create or replace view public.optimized_feed_view as
 SELECT i.id, i.user_id, i.item_type, i.created_at, i.title, i.content, i.description, i.image_urls, i.thumbnail_index, i.tags,
    i.is_public, i.color_label, i.servings, i.cooking_time_minutes, i.recipe_id, i.cited_recipe_ids,
    p.public_id AS user_public_id, p.display_name, p.username, p.avatar_url,
    COALESCE(like_stats.likes_count, 0::bigint) AS likes_count,
    COALESCE(comment_stats.comments_count, 0::bigint) AS comments_count,
    EXISTS (
      SELECT 1 FROM likes user_like
      WHERE user_like.user_id = auth.uid() AND user_like.item_id = i.id
    ) AS is_liked,
    i.creation_origin,
    COALESCE(rel.made_count, 0::bigint) AS made_count,
    COALESCE(rel.continued_count, 0::bigint) AS continued_count,
    COALESCE(rel.made_thumbs, '{}'::text[]) AS made_thumbs,
    COALESCE(ing.ingredient_count, 0::bigint) AS ingredient_count,
    COALESCE(ing.key_ingredients, '{}'::text[]) AS key_ingredients
   FROM items i
     LEFT JOIN profiles p ON i.user_id = p.id
     LEFT JOIN LATERAL (
       SELECT count(*) AS likes_count
       FROM likes
       WHERE likes.item_id = i.id
     ) like_stats ON true
     LEFT JOIN LATERAL (
       SELECT count(*) AS comments_count
       FROM comments
       WHERE comments.item_id = i.id AND comments.is_deleted = false
     ) comment_stats ON true
     LEFT JOIN LATERAL ( SELECT count(DISTINCT f.user_id) FILTER (WHERE f.item_type = 'post'::item_type) AS made_count,
            count(*) FILTER (WHERE f.item_type = 'recipe'::item_type) AS continued_count,
            (array_agg(f.image_urls[1] ORDER BY cr.created_at DESC) FILTER (WHERE f.item_type = 'post'::item_type AND f.image_urls[1] IS NOT NULL))[1:3] AS made_thumbs
           FROM content_relations cr
             JOIN items f ON f.id = cr.from_item_id AND f.is_public = true AND f.user_id <> i.user_id
          WHERE cr.to_recipe_id = i.id) rel ON i.item_type = 'recipe'::item_type
     LEFT JOIN LATERAL ( SELECT count(*) AS ingredient_count,
            (array_agg(g.name ORDER BY g.order_index))[1:3] AS key_ingredients
           FROM ingredients g WHERE g.item_id = i.id) ing ON i.item_type = 'recipe'::item_type
  WHERE i.is_public = true
  ORDER BY i.created_at DESC;
