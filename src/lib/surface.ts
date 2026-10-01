// 어느 화면에서 왔는지: 행동 기록의 origin에 쓴다 (성장 고리의 연결을 재기 위해).
// 화면 이동마다 지금 경로를 기억하고, 새 화면은 직전 경로를 화면 이름으로 읽는다. 저장 실패는 무시한다.
const KEY = "spoonie-path-trail"
const UUID = "[0-9a-f-]{36}"

export function rememberPath(path: string) {
	try {
		const trail = JSON.parse(sessionStorage.getItem(KEY) || "[]") as string[]
		if (trail[trail.length - 1] === path) return
		sessionStorage.setItem(KEY, JSON.stringify([...trail, path].slice(-2)))
	} catch {}
}

// 지금 화면(currentPath) 직전의 화면. 기록보다 먼저 읽혀도, 나중에 읽혀도 같은 답을 준다.
export function cameFrom(currentPath: string): { surface: string; itemId: string | null } {
	let prev: string | undefined
	try {
		const trail = JSON.parse(sessionStorage.getItem(KEY) || "[]") as string[]
		prev = trail[trail.length - 1] === currentPath ? trail[trail.length - 2] : trail[trail.length - 1]
	} catch {}
	if (!prev) return { surface: "external", itemId: null }
	const content = prev.match(new RegExp(`^/(recipes|posts)/(${UUID})`, "i"))
	if (content) return { surface: content[1] === "recipes" ? "recipe" : "post", itemId: content[2] }
	if (prev === "/") return { surface: "home", itemId: null }
	const first = prev.split("/")[1] || "other"
	const names: Record<string, string> = { search: "search", recipes: "recipebook", profile: "profile", notifications: "notifications", bookmarks: "bookmarks" }
	return { surface: names[first] || "other", itemId: null }
}
