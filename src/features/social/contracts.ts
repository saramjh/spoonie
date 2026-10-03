/**
 * 좋아요·저장·팔로우 기능의 계약(타입만). 계층 규칙은 features/recipe/contracts.ts와 같다.
 */

export type FollowDirection = "followers" | "following"

// 팔로워·팔로잉 목록의 한 사람 (FollowListModal)
export interface FollowPerson {
	id: string
	username: string
	avatar_url: string | null
	public_id: string | null
	followed_at: string
	// 보는 사람(로그인 사용자)이 이 사람을 팔로우하는지
	viewer_follows: boolean
}

// 좋아요한 사람 (LikersModal)
export interface LikerProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	public_id: string | null
	liked_at: string
}

// 서버의 좋아요 수와 내가 눌렀는지
export interface LikeServerState {
	likes_count: number
	is_liked: boolean
}

// DB 쓰기 결과: 실패하면 error (부르는 쪽이 화면을 되돌리고 던진다)
export interface WriteResult {
	error: unknown | null
}
