"use client"

import { ChefHat } from "lucide-react"
import { CheckBox, IntentLink, Magnet, Photo, PhotoCount } from "@/components/kit"
import { formatCookingTime } from "@/features/recipe/domain/recipe-amount"
import { useItemCache } from "@/hooks/useItemCache"
import { useNavigation } from "@/hooks/useNavigation"
import type { Item } from "@/types/item"
import { cn } from "@/lib/utils"

interface RecipeCardProps {
	item: Item
	isSelectable?: boolean
	isSelected?: boolean
	onSelectChange?: (checked: boolean) => void
	onSelect?: () => void
	showAuthor?: boolean
	// 색상 라벨(자석) 표시: 기본은 "나의 레시피"(작성자 표시 안 함)일 때만
	showColorLabel?: boolean
	priority?: boolean // LCP 최적화를 위한 이미지 우선순위
}

// 레시피북 격자 보기의 한 장: 문 판에 붙인 작은 종이. 색상 라벨이 있으면 자석이 위 모서리를 누른다.
export default function RecipeCard({ item, isSelectable, isSelected, onSelectChange, onSelect, showAuthor, showColorLabel = !showAuthor, priority = false }: RecipeCardProps) {
	const { createLinkWithOrigin } = useNavigation()

	const fallbackItem = {
		...item,
		likes_count: item.likes_count || 0,
		comments_count: item.comments_count || 0,
		is_liked: item.is_liked || false,
		image_urls: item.image_urls || null, // 섬네일 실시간 업데이트 지원
		thumbnail_index: item.thumbnail_index || 0,
	}
	const cachedItem = useItemCache(item.item_id, fallbackItem)
	// 표시용 값: 수정 직후 즉시 갱신되는 개별 항목 캐시를 우선한다
	const displayItem: Item = { ...item, ...cachedItem }

	const handleSelectChange = (checked: boolean) => {
		if (onSelectChange) onSelectChange(checked)
		else if (onSelect) onSelect()
	}

	const detailUrl = createLinkWithOrigin(`${item.item_type === "recipe" ? "/recipes" : "/posts"}/${item.item_id}`)
	// 색상 라벨은 주인의 정리 도구: "나의 레시피"에서만 보인다 (DESIGN.md Interface Grammar 3)
	const showColor = showColorLabel
	const cookingTime = formatCookingTime(displayItem.cooking_time_minutes)
	const thumbnail = cachedItem.image_urls?.[cachedItem.thumbnail_index || 0]
	const meta = [displayItem.servings ? `${displayItem.servings}인분` : null, cookingTime ? `조리 ${cookingTime}` : null].filter(Boolean)

	// 카드 한 장의 모양. 선택 모드에서는 누르면 선택되고(레시피로 가지 않는다), 평소에는 레시피로 간다
	const face = (
		<>
			{showColor && <Magnet color={displayItem.color_label} size="md" className="absolute -top-2 left-3.5 z-20" />}
			<span className="relative block aspect-[4/3] w-full overflow-hidden rounded-t-[3px] bg-muted">
				{/* 선택 모드에서는 같은 자리에 선택 상자가 오므로 사진 장수는 감춘다 */}
				{!isSelectable && <PhotoCount count={cachedItem.image_urls?.length || 0} />}
				{thumbnail ? (
					<Photo src={thumbnail} sizes="(max-width: 448px) 50vw, 220px" priority={priority} />
				) : (
					<span className="flex h-full w-full items-center justify-center">
						<ChefHat className="h-6 w-6 text-ink-soft" aria-hidden />
					</span>
				)}
				{isSelectable && <CheckBox checked={!!isSelected} className="absolute right-2 top-2" />}
			</span>
			<span className="block px-3 pb-3 pt-2 text-left">
				<span className="line-clamp-2 text-label font-semibold text-ink">{displayItem.title}</span>
				<span className="mt-1 block truncate text-meta text-ink-soft">
					{[showAuthor ? item.username : null, ...meta, !displayItem.is_public ? "비공개" : null].filter(Boolean).join(" · ")}
				</span>
			</span>
		</>
	)
	const sheet = cn("relative block w-full rounded-[3px] bg-paper shadow-sheet", isSelected && "ring-2 ring-ink")

	if (isSelectable) {
		return (
			<button type="button" role="checkbox" aria-checked={!!isSelected} aria-label={`${displayItem.title || "레시피"} 선택`} onClick={() => handleSelectChange(!isSelected)} className={sheet}>
				{face}
			</button>
		)
	}
	return (
		<IntentLink href={detailUrl} className={sheet}>
			{face}
		</IntentLink>
	)
}
