-- A bookmark is a private user action. The old public SELECT policy disclosed
-- which items any account saved, even without a signed-in session.
-- The existing "Users can manage their bookmarks" policy already grants
-- authenticated users access only where bookmarks.user_id = auth.uid().
-- SECURITY DEFINER get_explore / get_recipe_activity retain aggregate signals.
drop policy if exists "All users can view bookmarks" on public.bookmarks;
revoke select on table public.bookmarks from anon;
