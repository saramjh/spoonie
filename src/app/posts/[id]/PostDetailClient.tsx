"use client"

// useParams removed - using props instead
import ItemDetailView from "@/components/common/ItemDetailView"
import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import { useItemDetail } from "@/hooks/useItemDetail"
import { useNavigation } from "@/hooks/useNavigation"
import type { ItemDetail } from "@/types/item"

interface PostDetailClientProps {
	params: { id: string }
	initialItem?: ItemDetail | null
}

export default function PostDetailClient({ params, initialItem }: PostDetailClientProps) {
	const itemId = params.id

	// 🧭 네비게이션 체인 유지 (중간 경유지 역할)
	useNavigation({ trackHistory: true })

	// 통합 아이템 상세 훅 사용
	const { item, isLoading, error, refresh } = useItemDetail(itemId, initialItem)

	// 로딩 상태
	if (isLoading && !item) {
		return (
			<div className="p-4">
				<PostCardSkeleton />
			</div>
		)
	}

	// 에러 상태 - 더 자세한 오류 정보
	if (error) {
		console.error(`❌ PostDetailPage: Error loading item ${itemId}:`, error)
		const isNotFound = error.message?.includes("not found") || error.message?.includes("access denied")
		const is404 = error.code === 'PGRST116'
		
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-ink mb-2">
						{isNotFound || is404 ? "레시피드를 찾을 수 없습니다" : "레시피드 로딩 오류"}
					</h1>
					<p className="text-ink-soft mb-4">
						{isNotFound || is404 
							? "요청하신 레시피드가 존재하지 않거나 삭제되었습니다." 
							: "레시피드 데이터를 불러오는 중 오류가 발생했습니다."
						}
					</p>
					{!isNotFound && !is404 && (
						<div className="space-y-2">
							<p className="text-sm text-ink-soft">오류 세부정보: {error.message}</p>
							<button 
								onClick={refresh}
								className="px-4 py-2 bg-primary text-primary-foreground rounded hover:brightness-95 transition-colors"
							>
								다시 시도
							</button>
						</div>
					)}
				</div>
			</div>
		)
	}

	// 아이템이 없는 경우
	if (!item) {
		console.warn(`⚠️ PostDetailPage: No item data for ${itemId}`)
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-ink mb-2">레시피드가 없습니다</h1>
					<p className="text-ink-soft mb-4">레시피드 데이터를 불러올 수 없습니다.</p>
					<button 
						onClick={refresh}
						className="px-4 py-2 bg-primary text-primary-foreground rounded hover:brightness-95 transition-colors"
					>
						다시 시도
					</button>
				</div>
			</div>
		)
	}

	// 포스트가 아닌 경우 (타입 체크)
	if (item.item_type !== "post") {
		return (
			<div className="p-4">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-ink mb-2">잘못된 요청입니다</h1>
					<p className="text-ink-soft">이 항목은 게시물이 아닙니다.</p>
				</div>
			</div>
		)
	}

	return <ItemDetailView item={item} />
}