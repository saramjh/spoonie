import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

// 서버 렌더와 첫 화면(하이드레이션)에서는 false, 그 뒤로는 true.
// 미리 만든 페이지에 "지금" 기준 값(몇 분 전, 오늘)을 넣으면 화면을 여는 시점과 달라져 불일치가 나므로, 그런 값은 이 뒤에 그린다.
export function useHydrated() {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false
	)
}
