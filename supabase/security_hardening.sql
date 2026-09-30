-- 보안 강화 마이그레이션 (Supabase 보안 권고 대응)
-- 1. RLS가 꺼져 있던 공개 테이블 보호
-- 2. 회원 탈퇴 함수: 본인 확인 추가, 현재 테이블 구조에 맞게 재작성
-- 3. 앱이 호출하지 않는 옛 SECURITY DEFINER 함수의 외부 실행 권한 회수

-- ---------------------------------------------------------------------------
-- 1. adjectives, nouns, search_keywords: 누구나 읽기만 가능
--    (가입 시 닉네임을 만드는 handle_new_user 트리거는 테이블 소유자 권한으로 실행되어 영향 없음)
-- ---------------------------------------------------------------------------
alter table public.adjectives enable row level security;
alter table public.nouns enable row level security;
alter table public.search_keywords enable row level security;

drop policy if exists "Anyone can read adjectives" on public.adjectives;
create policy "Anyone can read adjectives" on public.adjectives for select using (true);

drop policy if exists "Anyone can read nouns" on public.nouns;
create policy "Anyone can read nouns" on public.nouns for select using (true);

drop policy if exists "Anyone can read search keywords" on public.search_keywords;
create policy "Anyone can read search keywords" on public.search_keywords for select using (true);

revoke insert, update, delete, truncate on public.adjectives, public.nouns, public.search_keywords from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. 회원 탈퇴: 로그인한 본인만 자기 계정을 삭제할 수 있다.
--    auth.users 삭제 시 profiles, user_push_settings가 연쇄 삭제되고,
--    profiles 삭제 시 items(재료/조리법/댓글/좋아요/북마크/알림 포함), comments, likes,
--    follows, bookmarks, notifications가 외래 키 ON DELETE CASCADE로 함께 삭제된다.
--    스토리지 이미지는 /api/delete-user 라우트가 이 함수 호출 전에 삭제한다.
-- ---------------------------------------------------------------------------
create or replace function public.delete_user_data(user_id_to_delete uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() <> user_id_to_delete then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  delete from auth.users where id = user_id_to_delete;
end;
$$;

revoke execute on function public.delete_user_data(uuid) from public, anon;
grant execute on function public.delete_user_data(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. 앱이 호출하지 않는 옛 함수들 (없는 posts/recipes 테이블을 참조하거나 정책 목록을 노출)
--    트리거 함수(handle_new_user, handle_updated_at)는 트리거로만 실행되므로 외부 실행 권한이 필요 없다.
-- ---------------------------------------------------------------------------
revoke execute on function public.check_rls_policies() from public, anon, authenticated;
revoke execute on function public.test_item_exists(uuid) from public, anon, authenticated;
revoke execute on function public.get_pending_like_notifications(uuid) from public, anon, authenticated;
revoke execute on function public.mark_like_notifications_sent(uuid[]) from public, anon, authenticated;
revoke execute on function public.get_likes_statistics(uuid, text) from public, anon, authenticated;
revoke execute on function public.toggle_like(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.get_item_details(text) from public, anon, authenticated;
revoke execute on function public.get_feed_items(integer, integer, uuid) from public, anon, authenticated;
revoke execute on function public.get_popular_posts(integer) from public, anon, authenticated;
revoke execute on function public.search_posts_and_recipes(text, integer) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
