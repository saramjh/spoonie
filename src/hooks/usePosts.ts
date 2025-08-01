"use client"

import { useState, useEffect, useCallback } from "react"
import useSWRInfinite from "swr/infinite"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item" // 통합된 타입 정의를 가져옵니다.
import type { ServerFeedData } from "@/lib/server-data"


const PAGE_SIZE = 10

// SWR 키 생성 함수. 이제 userId만 필요합니다.
const getKey = (pageIndex: number, previousPageData: Item[] | null, userId: string | null) => {
  if (previousPageData && !previousPageData.length) return null // 끝에 도달
  return `items|${pageIndex}|${userId || "guest"}`
}

/**
 * 홈 피드 데이터 페칭 함수
 * 레시피(recipe)와 레시피드(post) 모두 포함한 통합 피드를 가져옵니다
 * 
 * @param key - SWR 키 (페이지 인덱스와 사용자 ID 포함)
 * @returns 레시피와 레시피드가 포함된 FeedItem 배열
 */
const fetcher = async (key: string): Promise<Item[]> => {
  const supabase = createSupabaseBrowserClient()
  const [, pageIndexStr, userId] = key.split("|")
  const pageIndex = parseInt(pageIndexStr, 10)
  const offset = pageIndex * PAGE_SIZE

  // 최적화된 뷰에서 레시피(recipe)와 레시피드(post) 데이터 조회 - RLS가 권한 자동 처리
  const { data: items, error } = await supabase
    .from("optimized_feed_view")
    .select(`
      *,
      profiles!user_id (
        username,
        display_name,
        avatar_url,
        public_id
      )
    `)
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    throw error
  }
  
  if (!items || items.length === 0) {
    return []
  }

  const itemIds = items.map((item) => item.id)
  const authorIds = Array.from(new Set(items.map((item) => item.user_id))) // 중복 제거
  const userLikesMap = new Map<string, boolean>()
  const userFollowsMap = new Map<string, boolean>()

  // 사용자별 좋아요 상태와 팔로우 상태 조회 (로그인 시에만)
  if (userId && userId !== "guest") {
    try {
      // 좋아요 상태 조회
      const { data: userLikes, error: likesError } = await supabase
        .rpc('get_user_likes_for_items', {
          user_id_param: userId,
          item_ids_param: itemIds
        })

      if (!likesError && userLikes) {
        userLikes.forEach((like: { item_id: string; is_liked: boolean }) => {
          userLikesMap.set(like.item_id, like.is_liked)
        })
      }

      // 팔로우 상태 조회
      const { data: userFollows, error: followsError } = await supabase
        .rpc('get_user_follows_for_authors', {
          user_id_param: userId,
          author_ids_param: authorIds
        })

      if (!followsError && userFollows) {
        userFollows.forEach((follow: { author_id: string; is_following: boolean }) => {
          userFollowsMap.set(follow.author_id, follow.is_following)
        })
      }
    } catch {
      // 에러 발생 시 조용히 무시하고 기본값 사용
    }
  }

  // 레시피(recipe)와 레시피드(post)를 통합한 FeedItem 배열 생성
  	const feedItems: Item[] = items.map((item) => {
    // profiles 데이터 평면화 - 서버와 동일한 방식
    const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
    
    // 🔧 좋아요 상태를 정확히 구분: undefined(불확실) vs false(확실히 안함) vs true(확실히 함)
    const userLikeStatus = userLikesMap.get(item.id)
    const isLikedValue = userId && userId !== "guest" 
      ? (userLikeStatus !== undefined ? userLikeStatus : false) // 로그인 시: 정확한 상태 또는 false(임시, LikeButton에서 DB 확인)
      : false // 비로그인 시: 항상 false
    
    return {
			id: item.id,
      item_id: item.id,
      user_id: item.user_id,
			item_type: item.item_type as "post" | "recipe", // "recipe": 요리법, "post": 일반 피드
      created_at: item.created_at,
      is_public: item.is_public,
      // 🔧 안정적인 작성자 정보 처리 - profiles에서 가져온 데이터 우선 사용
      display_name: profileData?.display_name || item.display_name || null,
      username: profileData?.username || item.username || null,
      avatar_url: profileData?.avatar_url || item.avatar_url || null,
      user_public_id: profileData?.public_id || item.user_public_id || null,
      user_email: null,
      title: item.title,
      content: item.content,
      description: item.description,
      image_urls: item.image_urls,
      thumbnail_index: item.thumbnail_index ?? 0, // 🖼️ 썸네일 인덱스 (기본값 0)
      tags: item.tags,
      color_label: item.color_label,
      servings: item.servings,
      cooking_time_minutes: item.cooking_time_minutes,
      recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids, // 참고 레시피 ID 목록
      likes_count: item.likes_count || 0,
      comments_count: item.comments_count || 0,
      is_liked: isLikedValue, // 🔧 null 허용으로 불확실한 상태 표현
      is_following: userFollowsMap.get(item.user_id) || false,
    }
  })

  return feedItems
}

export function usePosts(initialData?: ServerFeedData | null) {
  const [user, setUser] = useState<User | null>(initialData?.currentUser || null)
  const [loadingUser, setLoadingUser] = useState(!initialData)

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

	const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite(
    (pageIndex, previousPageData) => getKey(pageIndex, previousPageData, user?.id ?? null), 
    fetcher, 
    {
      revalidateFirstPage: false,
      revalidateOnFocus: true, // 🎯 홈화면 포커스 시 최신 데이터 자동 업데이트
      dedupingInterval: 5000, // 5초로 단축 - 더 빠른 실시간 반영
      // 🚀 서버에서 미리 로딩된 초기 데이터 활용 (SSR 최적화)
      fallbackData: initialData?.items ? [initialData.items] : undefined,
    }
  )

  	const feedItems = data ? ([] as Item[]).concat(...data) : []
  const isLoading = loadingUser || (isValidating && feedItems.length === 0)
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE)

  const customMutate = useCallback(() => {
    return mutate()
  }, [mutate])

  // 🔍 백그라운드 스마트 동기화 (30초마다 자동)
  useEffect(() => {
    const interval = setInterval(() => {

      // 🚀 업계 표준: 삭제 직후에는 background sync 건너뛰기 (Instagram/Twitter 방식)
      // mutate 호출시 revalidate: false로 하여 서버에서 다시 가져오지 않음
      mutate(undefined, { revalidate: false }) // 캐시만 정리, 서버 재검증 없음
    }, 30000) // 30초마다

    return () => clearInterval(interval)
  }, [mutate])

  // 🎯 페이지 가시성 변화 감지 - 상세페이지에서 돌아올 때 즉시 동기화
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
  
        // 첫 페이지만 빠르게 revalidate하여 최신 변경사항 반영
        mutate(undefined, { revalidate: true })
      }
    }

    const handleFocus = () => {
      
      mutate(undefined, { revalidate: true })
    }

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
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
