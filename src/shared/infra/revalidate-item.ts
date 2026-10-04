// 작성자가 글을 만들거나 고치거나 지운 뒤 상세·검색 자산 캐시를 즉시 다시 만든다. 실패하면 각 페이지의 시간 기반 revalidate가 폴백한다.
export function revalidateItemPage(itemId: string | null | undefined, previousTags: string[] = []): Promise<boolean> {
	if (!itemId) return Promise.resolve(false)
	return fetch("/api/revalidate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ itemId, previousTags }),
		keepalive: true,
	})
		.then((response) => response.ok)
		.catch(() => false)
}

// 내 프로필(이름·사진·소개)을 바꾼 뒤 미리 만든 프로필 페이지를 바로 다시 만들게 한다
export function revalidateMyProfilePage() {
	fetch("/api/revalidate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ profile: true }),
		keepalive: true,
	}).catch(() => {})
}
