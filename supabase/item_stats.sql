-- 프로필/레시피북에서 쓰는 item 통계 집계.
-- 화면별 N+1이나 서비스 전체 전역 집계를 만들지 않는다.

create or replace function public.get_comment_counts_for_items(item_ids_param uuid[])
returns table(item_id uuid, comments_count bigint)
language sql
stable
set search_path = public, extensions
as $$
  select c.item_id, count(*)::bigint
  from comments c
  join items i on i.id = c.item_id
  where c.item_id = any(item_ids_param)
    and c.is_deleted = false
    and (i.is_public = true or i.user_id = auth.uid())
  group by c.item_id;
$$;

revoke all on function public.get_comment_counts_for_items(uuid[]) from public, anon;
grant execute on function public.get_comment_counts_for_items(uuid[]) to authenticated, service_role;

create or replace function public.get_user_recipes_with_accurate_stats(target_user_id uuid)
returns table(
  id uuid,
  user_id uuid,
  item_type text,
  created_at timestamptz,
  title text,
  content text,
  description text,
  image_urls text[],
  thumbnail_index integer,
  tags text[],
  is_public boolean,
  color_label text,
  servings integer,
  cooking_time_minutes integer,
  recipe_id uuid,
  cited_recipe_ids uuid[],
  user_public_id varchar,
  display_name varchar,
  username varchar,
  avatar_url varchar,
  likes_count bigint,
  comments_count bigint,
  is_liked boolean
)
language sql
stable
set search_path = public, extensions
as $$
  select
    i.id,
    i.user_id,
    i.item_type::text,
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
    p.public_id as user_public_id,
    p.display_name,
    p.username,
    p.avatar_url,
    coalesce(like_stats.likes_count, 0::bigint) as likes_count,
    coalesce(comment_stats.comments_count, 0::bigint) as comments_count,
    exists (
      select 1
      from likes user_like
      where user_like.user_id = auth.uid()
        and user_like.item_id = i.id
    ) as is_liked
  from items i
  left join profiles p on p.id = i.user_id
  left join lateral (
    select count(*)::bigint as likes_count
    from likes l
    where l.item_id = i.id
  ) like_stats on true
  left join lateral (
    select count(*)::bigint as comments_count
    from comments c
    where c.item_id = i.id
      and c.is_deleted = false
  ) comment_stats on true
  where i.item_type = 'recipe'
    and i.user_id = target_user_id
  order by i.created_at desc, i.id desc;
$$;
