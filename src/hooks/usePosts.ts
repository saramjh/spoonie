"use client"

import { useState, useEffect, useCallback } from "react"
import useSWRInfinite from "swr/infinite"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { User } from "@supabase/supabase-js"
import type { FeedItem } from "@/types/item" // 통합된 타입 정의를 가져옵니다.


const PAGE_SIZE = 10

// SWR 키 생성 함수. 이제 userId만 필요합니다.
const getKey = (pageIndex: number, previousPageData: FeedItem[] | null, userId: string | null) => {
  if (previousPageData && !previousPageData.length) return null // 끝에 도달
  return `items|${pageIndex}|${userId || "guest"}`
}

// 🚀 최적화된 피드 fetcher (기존: 3개 쿼리 → 새로운: 1개 뷰 + 1개 사용자 함수)
const fetcher = async (key: string): Promise<FeedItem[]> => {
  const supabase = createSupabaseBrowserClient()
  const [, pageIndexStr, userId] = key.split("|")
  const pageIndex = parseInt(pageIndexStr, 10)
  const offset = pageIndex * PAGE_SIZE

  console.log(`🚀 Fetching optimized feed page ${pageIndex} for user ${userId}`)
  const startTime = Date.now()

  // 1. 최적화된 뷰에서 한 번에 모든 데이터 조회 (통계 포함)
  const { data: items, error } = await supabase
    .from("optimized_feed_view")
    .select("*")
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    console.error("❌ Error fetching optimized feed:", error)
    throw error
  }
  
  if (!items || items.length === 0) {
    console.log(`📭 No items found for page ${pageIndex}`)
    return []
  }

  const itemIds = items.map((item) => item.id)
  const userLikesMap = new Map<string, boolean>()

  // 2. 사용자별 좋아요 상태만 별도 조회 (로그인 시에만)
  if (userId && userId !== "guest") {
    try {
      const { data: userLikes, error: likesError } = await supabase
        .rpc('get_user_likes_for_items', {
          user_id_param: userId,
          item_ids_param: itemIds
        })

      if (likesError) {
        console.warn("⚠️ Failed to fetch user likes, continuing without:", likesError)
      } else {
        userLikes?.forEach((like: { item_id: string; is_liked: boolean }) => {
          userLikesMap.set(like.item_id, like.is_liked)
        })
      }
    } catch (error) {
      console.warn("⚠️ User likes query failed, continuing without:", error)
    }
  }

  // 3. 최종 데이터 조합 (뷰에서 미리 계산된 통계 활용)
  const feedItems: FeedItem[] = items.map((item) => {
    return {
			id: item.id, // 타입 에러 수정을 위한 id 필드 추가
      item_id: item.id,
      user_id: item.user_id,
			item_type: item.item_type as "post" | "recipe",
      created_at: item.created_at,
      is_public: item.is_public,
      display_name: item.display_name || item.username || "사용자",
      avatar_url: item.avatar_url || null,
      user_public_id: item.user_public_id || null,
      user_email: null, // 이메일은 더 이상 직접 가져오지 않음
      title: item.title,
      content: item.content,
      description: item.description,
      image_urls: item.image_urls,
      tags: item.tags,
      color_label: item.color_label,
      servings: item.servings,
      cooking_time_minutes: item.cooking_time_minutes,
      recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids, // 🔥 누락된 필드 추가!
      likes_count: item.likes_count || 0, // 🚀 뷰에서 미리 계산된 값 사용
      comments_count: item.comments_count || 0, // 🚀 뷰에서 미리 계산된 값 사용
      is_liked: userLikesMap.get(item.id) || false,
      is_following: false, // 팔로우 상태는 별도 로직으로 관리 필요
    }
  })

  const endTime = Date.now()
  const fetchDuration = endTime - startTime
  console.log(`✅ Optimized feed fetch completed in ${fetchDuration}ms for ${feedItems.length} items`)

	console.log(
		"usePosts: final feedItems with cited_recipe_ids",
		feedItems.map((item) => ({
			id: item.item_id,
			title: item.title,
			cited_recipe_ids: item.cited_recipe_ids,
		}))
	) // 🔍 개선된 디버깅 로그
  return feedItems
}

export function usePosts() {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseBrowserClient()
			const {
				data: { user },
			} = await supabase.auth.getUser()
      setUser(user)
      setLoadingUser(false)
    }
    fetchUser()
  }, [])

	const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite((pageIndex, previousPageData) => getKey(pageIndex, previousPageData, user?.id ?? null), fetcher, {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5초로 단축 - 더 빠른 실시간 반영
	})

  const feedItems = data ? ([] as FeedItem[]).concat(...data) : []
  const isLoading = loadingUser || (isValidating && feedItems.length === 0)
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE)

  const customMutate = useCallback(() => {
    return mutate()
  }, [mutate])

  return {
    feedItems,
    isLoading,
    isError: !!error,
    size,
    setSize,
    isReachingEnd,
    mutate: customMutate,
  }
}
