"use client"

// useParams removed - using props instead
import ItemDetailView from "@/components/common/ItemDetailView"
import DetailStateMessage from "@/components/common/DetailStateMessage"
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

	// 네비게이션 체인 유지 (중간 경유지 역할)
	useNavigation({ trackHistory: true })

	// 통합 아이템 상세 훅 사용
	const { item, isLoading, error, refresh } = useItemDetail(itemId, initialItem)

	// 로딩 상태
	if (isLoading && !item) {
		return (
			<div className="px-3 pt-3">
				<PostCardSkeleton />
			</div>
		)
	}

	if (error) {
		console.error(`DetailPage: Error loading item ${itemId}:`, error)
		const notFound = error.message?.includes("not found") || error.message?.includes("access denied") || error.code === "PGRST116"
		return notFound ? (
			<DetailStateMessage
				title="레시피드를 찾을 수 없어요"
				body="주소가 바뀌었거나, 글이 삭제되었거나, 작성자가 비공개로 돌렸을 수 있어요."
				link={{ href: "/", label: "홈으로" }}
			/>
		) : (
			<DetailStateMessage title="레시피드를 불러오지 못했어요" body="연결 상태를 확인하고 다시 불러와 주세요." onRetry={refresh} />
		)
	}

	if (!item) {
		return <DetailStateMessage title="레시피드를 불러오지 못했어요" body="잠시 후 다시 불러와 주세요." onRetry={refresh} />
	}

	// 다른 종류의 주소로 들어온 경우: 맞는 주소로 안내한다
	if (item.item_type !== "post") {
		return (
			<DetailStateMessage
				title="다른 종류의 글이에요"
				body="이 주소는 레시피를 가리켜요."
				link={{ href: `/recipes/${itemId}`, label: "그 글로 가기" }}
			/>
		)
	}

	return <ItemDetailView item={item} />
}
