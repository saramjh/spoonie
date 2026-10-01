"use client"

import { ChefHat } from "lucide-react"
import { CheckBox, IntentLink, Magnet, Photo, PhotoCount } from "@/components/kit"
import { formatCookingTime } from "@/lib/recipe-amount"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { useNavigation } from "@/hooks/useNavigation"
import type { Item } from "@/types/item"

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
	const cachedItem = useSSAItemCache(item.item_id, fallbackItem)
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
	const meta = [displayItem.servings ? `${displayItem.servings}인분` : null, cookingTime].filter(Boolean)

	return (
		<div className="relative">
			{isSelectable && (
				<button
					type="button"
					role="checkbox"
					aria-checked={!!isSelected}
					aria-label={`${displayItem.title || "레시피"} 선택`}
					onClick={() => handleSelectChange(!isSelected)}
					className="absolute right-0 top-0 z-30 flex h-11 w-11 items-center justify-center"
				>
					<CheckBox checked={!!isSelected} />
				</button>
			)}

			<IntentLink href={detailUrl} className="relative block rounded-[3px] bg-paper shadow-sheet">
				{showColor && <Magnet color={displayItem.color_label} size="md" className="absolute -top-2 left-3 z-20" />}
				<div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[3px] bg-muted">
					<PhotoCount count={cachedItem.image_urls?.length || 0} />
					{thumbnail ? (
						<Photo src={thumbnail} sizes="(max-width: 448px) 50vw, 220px" priority={priority} />
					) : (
						<div className="flex h-full w-full items-center justify-center">
							<ChefHat className="h-6 w-6 text-ink-soft" aria-hidden />
						</div>
					)}
				</div>
				<div className="px-3 pb-3 pt-2">
					<h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{displayItem.title}</h3>
					<p className="mt-1 truncate text-[13px] text-ink-soft">
						{[showAuthor ? item.username : null, ...meta, !displayItem.is_public ? "비공개" : null].filter(Boolean).join(" · ")}
					</p>
				</div>
			</IntentLink>
		</div>
	)
}
