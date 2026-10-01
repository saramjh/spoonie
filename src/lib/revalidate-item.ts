// 작성자가 글을 고치거나 지운 뒤, 미리 만든 상세 페이지를 바로 다시 만들게 한다 (실패해도 10분 안에 갱신된다)
export function revalidateItemPage(itemId: string | null | undefined) {
	if (!itemId) return
	fetch("/api/revalidate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ itemId }),
		keepalive: true,
	}).catch(() => {})
}
