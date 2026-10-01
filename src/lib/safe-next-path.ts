// 로그인 후 돌아갈 경로: 같은 사이트 안의 경로만 허용한다 (열린 리디렉션 방지)
export function safeNextPath(raw: string | null | undefined): string {
	if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/"
	try {
		const base = "https://spoonie.invalid"
		const url = new URL(raw, base)
		if (url.origin !== base) return "/"
		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return "/"
	}
}
