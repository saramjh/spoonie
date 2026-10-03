import SearchClient from "./SearchClient"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"
import { fetchExplore, type ExploreData } from "@/features/feed/data/explore"

// 검색어가 없을 때의 탐색 목록을 공개 데이터로 미리 그려 CDN에 둔다 (10분마다 갱신).
// 검색엔진이 받는 HTML에 레시피 목록과 링크가 들어가고, 방문마다 서버 함수가 돌지 않는다.
// 검색 결과(검색어 입력 후)는 지금처럼 브라우저가 가져온다.
export const revalidate = 600

async function loadExplore(): Promise<ExploreData | null> {
	try {
		return await fetchExplore(createSupabasePublicClient())
	} catch (error) {
		console.error("Explore prerender failed:", error)
		return null
	}
}

export default async function SearchPage() {
	const initialExplore = await loadExplore()
	return (
		<>
			<h1 className="sr-only">Spoonie 레시피 찾기</h1>
			<SearchClient initialExplore={initialExplore} />
		</>
	)
}
