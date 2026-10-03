"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { fetchExplore, type ExploreData } from "@/features/feed/data/explore"

export type { ExploreData, MadeRecord } from "@/features/feed/data/explore"

/**
 * 탐색 화면(검색어 없음)의 두 묶음 (DESIGN.md Interface Grammar 1, docs/discovery-and-behavior.md)
 * - 레시피: 최근 30일 동안 다른 사람이 실제로 쓴 정도로 정렬, 한 작성자 최대 2개, 새 레시피 1자리
 * - 만들어 본 기록: 레시피에 이어진 최근 레시피드 (같은 레시피·같은 사람 최대 2개)
 * 서버가 미리 그린 목록이 있으면 그것으로 시작하고 첫 화면에서 다시 받지 않는다. 5분 동안 재사용한다.
 */
export function useExplore(fallbackData?: ExploreData | null) {
	return useSWR("explore|v2", () => fetchExplore(createSupabaseBrowserClient()), {
		fallbackData: fallbackData ?? undefined,
		revalidateOnMount: !fallbackData,
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		dedupingInterval: 5 * 60 * 1000,
	})
}
