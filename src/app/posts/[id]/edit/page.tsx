"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import PostForm from "@/components/items/PostForm"
import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import { useItemDetail } from "@/hooks/useItemDetail"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"

export default function PostEditPage() {
	const params = useParams()
	const itemId = params.id as string

	// 🚀 SSA: 기본 데이터 로딩 (완전한 상세 정보 포함)
	const { item: baseItem, isLoading, error } = useItemDetail(itemId)

	// 🚀 SSA: 캐시된 최신 데이터 구독 (실시간 업데이트용) - Hook 안정성 보장
	const fallbackData = baseItem || {
		id: itemId,
		item_id: itemId,
		user_id: '',
		item_type: 'post' as const,
		created_at: new Date().toISOString(),
		title: '',
		content: '',
		description: '',
		image_urls: [],
		thumbnail_index: 0,
		tags: [],
		is_public: true,
		color_label: null,
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
		if (baseItem && !initialData) {
			// Selective Merge: 서버 데이터 + 캐시된 실시간 필드
			const mergedData = {
				...baseItem, // 완전한 서버 데이터 (cited_recipe_ids, tags 포함)
				// 캐시에서 실시간 업데이트 필드만 선택적으로 적용 (baseItem이 있을 때만)
				...(baseItem && {
					thumbnail_index: cachedItem.thumbnail_index, // 썸네일 상태
					likes_count: cachedItem.likes_count, // 좋아요 수
					is_liked: cachedItem.is_liked, // 좋아요 상태
					comments_count: cachedItem.comments_count, // 댓글 수
					image_urls: cachedItem.image_urls, // 이미지 URL (썸네일 변경 반영)
				})
			}
			
			console.log("🎯 PostEditPage: Selective Merge complete", {
				hasBaseItem: !!baseItem,
				hasCachedItem: !!cachedItem,
				baseCitedRecipes: baseItem.cited_recipe_ids?.length || 0,
				baseTags: baseItem.tags?.length || 0,
				baseThumbnail: baseItem.thumbnail_index,
				cachedThumbnail: cachedItem?.thumbnail_index,
				finalThumbnail: mergedData.thumbnail_index,
				dataComplete: !!(mergedData.cited_recipe_ids !== undefined && mergedData.tags !== undefined)
			})
			
			setInitialData(mergedData)
		}
	}, [baseItem, cachedItem, initialData])

	if (isLoading) {
		return (
			<div className="p-4">
				<PostCardSkeleton />
			</div>
		)
	}

	if (error || !initialData) {
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						레시피드를 찾을 수 없습니다
					</h1>
					<p className="text-gray-600">
						요청하신 레시피드가 존재하지 않거나 삭제되었습니다.
					</p>
				</div>
			</div>
		)
	}

	if (initialData.item_type !== "post") {
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 요청입니다</h1>
					<p className="text-gray-600">이 항목은 레시피드가 아닙니다.</p>
				</div>
			</div>
		)
	}

	console.log("🎯 PostEditPage: Using initial data with thumbnail_index:", initialData.thumbnail_index)

	return <PostForm isEditMode={true} initialData={initialData} />
}
