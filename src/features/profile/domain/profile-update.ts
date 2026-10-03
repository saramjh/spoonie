/**
 * 프로필 수정 값 만들기 (순수 함수). ProfileEditor.tsx에서 내용을 바꾸지 않고 옮겨 왔다.
 * 사용자 이름이 바뀐 경우에만 변경 횟수를 하나 올린다.
 */

export function buildProfileUpdate(
	formData: { username: string; profileMessage: string },
	initialProfile: { username?: string | null; username_changed_count?: number | null } | null | undefined,
	finalAvatarUrl: string | null | undefined
): Record<string, string | number | null> {
	const usernameChanged = formData.username !== (initialProfile?.username || "")
	const updateData: Record<string, string | number | null> = {
		username: formData.username,
		profile_message: formData.profileMessage,
		avatar_url: finalAvatarUrl || null,
	}
	if (usernameChanged) updateData.username_changed_count = (initialProfile?.username_changed_count || 0) + 1
	return updateData
}
