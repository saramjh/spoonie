"use client"

import { useParams } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import RecipeForm from "@/components/recipe/RecipeForm"
import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import { useItemDetail } from "@/hooks/useItemDetail"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { useNavigation } from "@/hooks/useNavigation"

export default function RecipeEditPage() {
  const params = useParams()
  const itemId = params.id as string



  // 🧭 스마트 네비게이션 (이전 경로 추적)
  const { navigateBack } = useNavigation({ trackHistory: true })

  // 🚀 SSA: 기본 데이터 로딩 (완전한 상세 정보 포함)
  const { item: baseItem, isLoading, error } = useItemDetail(itemId)

  	// 🚀 SSA: 캐시된 최신 데이터 구독 (실시간 업데이트용) - Hook 안정성 보장
	const fallbackData = baseItem || {
		id: itemId,
		item_id: itemId,
		user_id: '',
		item_type: 'recipe' as const,
		created_at: new Date().toISOString(),
		title: '',
		content: '',
		description: '',
		image_urls: [],
		thumbnail_index: 0,
		tags: [],
		is_public: true,
		color_label: null,
		ingredients: [],
		instructions: [],
		servings: null,
		cooking_time_minutes: null,
		recipe_id: null,
		cited_recipe_ids: null,
		likes_count: 0,
		comments_count: 0,
		is_liked: false,
		is_following: false
	}
	const cachedItem = useSSAItemCache(itemId, fallbackData)

  // 🚀 SSA: 업계표준 Selective Merge - 폼 데이터는 서버에서, 실시간 필드만 캐시에서
  const [initialData, setInitialData] = useState<any>(null)

  useEffect(() => {
    // RecipeEditPage: Data state check: { hasBaseItem, hasCachedItem, hasInitialData, isLoading, error, baseItemType, baseItemPublic, baseItemUserId }

    if (baseItem && !initialData) {
      // Selective Merge: 서버 데이터 + 캐시된 실시간 필드 
      const mergedData = {
        ...baseItem, // 완전한 서버 데이터 (ingredients, instructions 포함)
        // 캐시에서 실시간 업데이트 필드만 선택적으로 적용 (baseItem이 있을 때만)
        ...(baseItem && {
          thumbnail_index: cachedItem.thumbnail_index, // 썸네일 상태
          likes_count: cachedItem.likes_count, // 좋아요 수
          is_liked: cachedItem.is_liked, // 좋아요 상태  
          comments_count: cachedItem.comments_count, // 댓글 수
          image_urls: cachedItem.image_urls, // 이미지 URL (썸네일 변경 반영)
        })
      }
      
      // RecipeEditPage: Selective Merge complete: { hasBaseItem, hasCachedItem, baseIngredients, baseInstructions, baseThumbnail, cachedThumbnail, finalThumbnail, dataComplete }
      
      setInitialData(mergedData)
    }
    // 🆘 긴급 fallback: baseItem 없이 cachedItem만 있는 경우 (비공개→공개 전환 시나리오)
    else if (!baseItem && !isLoading && cachedItem && cachedItem.id && !initialData) {
      console.warn("⚠️ RecipeEditPage: Using cached data as fallback (baseItem missing)", {
        cachedItemType: cachedItem.item_type,
        cachedItemPublic: cachedItem.is_public
      })
      
      setInitialData(cachedItem)
    }
  }, [baseItem, cachedItem, initialData, isLoading, error])

  if (isLoading) {
    
    return (
      <div className="p-4">
        <PostCardSkeleton />
      </div>
    )
  }

  // 🚀 개선된 에러 조건: 실제 에러가 있고 baseItem도 없는 경우에만 에러 처리
  if (error && !baseItem) {
    console.error("RecipeEditPage: Error loading item", itemId, error)
    return (
      <div className="p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            레시피를 찾을 수 없습니다
          </h1>
          <p className="text-gray-600">
            요청하신 레시피가 존재하지 않거나 삭제되었습니다.
          </p>
        </div>
      </div>
    )
  }

  // 🎯 로딩 중이거나 initialData가 준비되지 않은 경우 스켈레톤 표시
  if (!initialData) {

    return (
      <div className="p-4">
        <PostCardSkeleton />
      </div>
    )
  }

  if (initialData.item_type !== "recipe") {
    return (
      <div className="p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 요청입니다</h1>
          <p className="text-gray-600">이 항목은 레시피가 아닙니다.</p>
        </div>
      </div>
    )
  }

  

  return <RecipeForm 
    initialData={initialData} 
    onNavigateBack={navigateBack}
  />
}
