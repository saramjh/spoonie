-- profiles.email이 공개 API로 누구에게나 조회되던 문제 수정.
-- 테이블 단위 SELECT 권한을 회수하고, 공개해도 되는 컬럼만 다시 허용한다 (email, role 제외).
-- 앱 코드는 PUBLIC_PROFILE_COLUMNS(src/lib/profile-data.ts)로 필요한 컬럼만 조회하도록 먼저 배포해야 한다.
-- SECURITY DEFINER 뷰와 트리거(optimized_feed_view, handle_new_user 등)는 소유자 권한으로 동작해 영향이 없다.

revoke select on public.profiles from anon, authenticated;

grant select (
  id, username, display_name, avatar_url, entity_type, bio, profile_message,
  created_at, updated_at, public_id, is_profile_public,
  show_follower_count, show_join_date, username_changed_count
) on public.profiles to anon, authenticated;

-- 앱이 호출하지 않으며 email을 반환하는 함수
revoke execute on function public.get_users_with_profiles from public, anon, authenticated;
