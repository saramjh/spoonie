-- 로그인 사용자가 자기 폴더의 이미지를 조회하고 삭제할 수 있게 하는 저장소 정책.
-- 회원 탈퇴 시 /api/delete-user가 사용자의 이미지와 아바타를 지우는 데 필요하다.
-- (item-images 버킷은 "사용자ID/파일명" 구조이고, 아바타는 "사용자ID.확장자" 이름이다)
-- 2026-10-01 MCP로 적용. 여러 번 실행해도 안전하다.

drop policy if exists "Users can list own item images" on storage.objects;
create policy "Users can list own item images" on storage.objects for select to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "Users can delete own item images" on storage.objects;
create policy "Users can delete own item images" on storage.objects for delete to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name like ((auth.uid())::text || '%'));
