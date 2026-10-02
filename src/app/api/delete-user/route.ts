import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	const supabase = await createSupabaseRouteHandlerClient();

	// 로그인한 본인만 자신의 계정을 삭제할 수 있다. 삭제 대상은 세션에서 정하고, 본문 값은 확인용으로만 쓴다.
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => ({}));
	if (body?.userId && body.userId !== user.id) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	const userId = user.id;

	try {
		// 1. 이미지 삭제. item-images 버킷은 "사용자ID/파일명" 구조라 사용자 폴더 전체를 지우면
		//    레시피, 게시물, 조리 단계 이미지가 모두 정리된다. 아바타는 "사용자ID.확장자" 이름이다.
		//    (저장소 정책 supabase/storage_owner_policies.sql이 있어야 조회/삭제가 된다.
		//     정책이 없으면 목록이 비어 이미지는 남지만 계정 삭제는 계속 진행한다)
		try {
			for (;;) {
				const { data: files, error: listError } = await supabase.storage.from("item-images").list(userId, { limit: 1000 });
				if (listError) {
					console.error("Error listing user images for deletion:", listError.message);
					break;
				}
				if (!files || files.length === 0) break;
				const { error: removeError } = await supabase.storage.from("item-images").remove(files.map((file) => `${userId}/${file.name}`));
				if (removeError) {
					console.error("Error removing user images:", removeError.message);
					break;
				}
				if (files.length < 1000) break;
			}

			const { data: avatars } = await supabase.storage.from("avatars").list("", { search: userId, limit: 100 });
			const avatarPaths = (avatars ?? []).map((file) => file.name).filter((name) => name.startsWith(userId));
			if (avatarPaths.length > 0) {
				await supabase.storage.from("avatars").remove(avatarPaths);
			}
		} catch (storageError) {
			console.error("Error during image cleanup:", storageError);
		}

		// 2. 계정 삭제. auth.users 삭제가 프로필과 모든 콘텐츠(게시물, 댓글, 좋아요, 팔로우, 북마크, 알림)로 연쇄된다.
		const { error: deleteDataError } = await supabase.rpc("delete_user_data", { user_id_to_delete: userId });

		if (deleteDataError) {
			console.error("Error deleting user data from database:", deleteDataError.message);
			return NextResponse.json({ error: "계정 데이터를 삭제하지 못했습니다." }, { status: 500 });
		}

		return NextResponse.json({ message: "User and associated data deleted successfully" }, { status: 200 });
	} catch (error: unknown) {
		console.error("Unhandled error during user deletion:", error instanceof Error ? error.message : error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
