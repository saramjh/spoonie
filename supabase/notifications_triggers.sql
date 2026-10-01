-- 알림 생성을 브라우저에서 DB 트리거로 옮긴다.
-- 좋아요, 댓글/답글, 팔로우가 기록되면 서버가 직접 알림을 만들기 때문에
-- 다른 사람 명의의 가짜 알림이나 탭을 닫아 알림이 빠지는 문제가 없다.

-- 좋아요: 게시물 작성자에게 1회만 (좋아요를 껐다 켜도 중복 알림 없음)
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id from public.items where id = new.item_id;
  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;
  if exists (
    select 1 from public.notifications
    where user_id = owner_id and from_user_id = new.user_id and type = 'like' and item_id = new.item_id
  ) then
    return new;
  end if;
  insert into public.notifications (user_id, from_user_id, item_id, type, is_read)
  values (owner_id, new.user_id, new.item_id, 'like', false);
  return new;
end;
$$;

drop trigger if exists likes_notify on public.likes;
create trigger likes_notify after insert on public.likes
  for each row execute function public.notify_on_like();

-- 댓글/답글: 게시물 작성자와(답글이면) 원댓글 작성자에게. 본인 제외, 1분 내 같은 알림은 생략
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  for recipient in
    select distinct r from (
      select user_id as r from public.items where id = new.item_id
      union all
      select user_id from public.comments where id = new.parent_comment_id
    ) s
    where r is not null and r <> new.user_id
  loop
    if not exists (
      select 1 from public.notifications
      where user_id = recipient and from_user_id = new.user_id and type = 'comment'
        and item_id = new.item_id and created_at > now() - interval '1 minute'
    ) then
      insert into public.notifications (user_id, from_user_id, item_id, type, is_read)
      values (recipient, new.user_id, new.item_id, 'comment', false);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_on_comment();

-- 팔로우: 팔로우 대상에게 1회만 (언팔로우 후 다시 팔로우해도 중복 알림 없음)
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.following_id = new.follower_id then
    return new;
  end if;
  if exists (
    select 1 from public.notifications
    where user_id = new.following_id and from_user_id = new.follower_id and type = 'follow'
  ) then
    return new;
  end if;
  insert into public.notifications (user_id, from_user_id, type, is_read)
  values (new.following_id, new.follower_id, 'follow', false);
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_on_follow();

-- 트리거 함수는 외부에서 직접 호출할 필요가 없다
revoke execute on function public.notify_on_like() from public, anon, authenticated;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
revoke execute on function public.notify_on_follow() from public, anon, authenticated;

-- 브라우저가 만들 수 있는 알림은 레시피 인용뿐이고, 반드시 본인 명의여야 한다
drop policy if exists "System can create notifications" on public.notifications;
drop policy if exists "Users can create notifications for others" on public.notifications;
create policy "Users can create recipe citation notifications" on public.notifications
  for insert to authenticated
  with check (from_user_id = auth.uid() and user_id <> auth.uid() and type = 'recipe_cited');

-- 푸시 구독 정보는 서버(비밀 키)만 읽는다. 본인 구독 관리 정책은 유지
drop policy if exists "Allow reading active push settings for notifications" on public.user_push_settings;
