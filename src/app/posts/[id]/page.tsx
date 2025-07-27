"use client"

import { useParams } from "next/navigation"
import ItemDetailView from "@/components/common/ItemDetailView"
import PostCardSkeleton from "@/components/feed/PostCardSkeleton"
import { useItemDetail } from "@/hooks/useItemDetail"

export default function PostDetailPage() {
	const params = useParams()
	const itemId = params.id as string

	// 통합 아이템 상세 훅 사용
	const { item, isLoading, error } = useItemDetail(itemId)

	// 로딩 상태
	if (isLoading) {
		return (
			<div className="p-4">
				<PostCardSkeleton />
			</div>
		)
	}

	// 에러 상태
	if (error) {
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">게시물을 찾을 수 없습니다</h1>
					<p className="text-gray-600">요청하신 게시물이 존재하지 않거나 삭제되었습니다.</p>
				</div>
			</div>
		)
	}

	// 아이템이 없는 경우
	if (!item) {
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">게시물이 없습니다</h1>
					<p className="text-gray-600">게시물 데이터를 불러올 수 없습니다.</p>
				</div>
			</div>
		)
	}

	// 포스트가 아닌 경우 (타입 체크)
	if (item.item_type !== "post") {
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">잘못된 요청입니다</h1>
					<p className="text-gray-600">이 항목은 게시물이 아닙니다.</p>
				</div>
			</div>
		)
	}

	return <ItemDetailView item={item} />
}
