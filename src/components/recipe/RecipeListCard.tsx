"use client"

import Link from "next/link"
import Image from "next/image"
import { Check, ChefHat } from "lucide-react"
import { getMagnet } from "@/lib/color-options"
import { formatCompactTime } from "@/lib/utils"
import { formatCookingTime } from "@/lib/recipe-amount"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { useNavigation } from "@/hooks/useNavigation"
import type { Item } from "@/types/item"

interface RecipeListCardProps {
  	item: Item;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onSelect?: () => void;
  showAuthor?: boolean;
  priority?: boolean; // LCP 최적화를 위한 이미지 우선순위
}

export default function RecipeListCard({ 
  item, 
  isSelectable = false, 
  isSelected = false, 
  onSelectChange, 
  onSelect,
  showAuthor = false,
  priority = false
}: RecipeListCardProps) {
  const { createLinkWithOrigin } = useNavigation()
  
  // SSA 기반 캐시 연동 (이미지 포함)
  const fallbackItem = {
    ...item,
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    is_liked: item.is_liked || false,
    is_bookmarked: (item as Item & { is_bookmarked?: boolean }).is_bookmarked || false,
    image_urls: item.image_urls || null, // 섬네일 실시간 업데이트 지원
    thumbnail_index: item.thumbnail_index || 0
  }
  const cachedItem = useSSAItemCache(item.item_id, fallbackItem)
  // 표시용 값: 수정 직후 즉시 갱신되는 개별 항목 캐시를 우선하고, 캐시에 없는 값만 목록 데이터를 쓴다.
  // (목록 캐시는 새로고침 전까지 갱신되지 않아 제목, 색상 라벨 등이 이전 값으로 남던 문제 방지)
  const displayItem: Item = { ...item, ...cachedItem }
  
  const handleSelectChange = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(checked);
    } else if (onSelect) {
      onSelect();
    }
  };

  const baseUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${item.item_id}`;
  const detailUrl = createLinkWithOrigin(baseUrl);

  // 색상 라벨은 주인의 정리 도구: "나의 레시피"에서만 보인다 (DESIGN.md Interface Grammar 3)
  const magnet = showAuthor ? null : getMagnet(displayItem.color_label)
  const cookingTime = formatCookingTime(displayItem.cooking_time_minutes)
  const ingredientCount = item.ingredients?.length || 0
  const thumbnail = cachedItem.image_urls?.[cachedItem.thumbnail_index || 0]
  const meta = [
    displayItem.servings ? `${displayItem.servings}인분` : null,
    cookingTime ? `조리 ${cookingTime}` : null,
    ingredientCount ? `재료 ${ingredientCount}가지` : null,
  ].filter(Boolean)

  // 레시피북의 한 줄: 문 판에 접어 붙인 종이처럼 머리(사진, 제목, 한 줄 메타)만 보인다
  return (
    <div className="relative">
      {isSelectable && (
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={`${displayItem.title || "레시피"} 선택`}
          onClick={() => handleSelectChange(!isSelected)}
          className="absolute left-0 top-0 z-30 flex h-11 w-11 items-center justify-center"
        >
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-[4px] border-[1.5px] ${isSelected ? "border-ink bg-ink text-paper" : "border-ink-soft bg-paper"}`}
          >
            {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
        </button>
      )}

      <Link href={detailUrl} className="relative flex items-center gap-3 rounded-[3px] bg-paper p-2 pr-4 shadow-sheet">
        {magnet && (
          <span
            role="img"
            aria-label={`색상 라벨 ${magnet.label}`}
            className="absolute -left-1.5 top-1/2 z-20 h-5 w-5 -translate-y-1/2 rounded-full shadow-[0_1px_3px_rgba(35,40,43,0.35)]"
            style={{ backgroundColor: magnet.hex }}
          />
        )}
        <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[2px] bg-muted">
          {thumbnail ? (
            <Image src={thumbnail} alt="" fill sizes="72px" className="object-cover" priority={priority} />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ChefHat className="h-6 w-6 text-ink-soft" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold text-ink">{displayItem.title}</h3>
          {meta.length > 0 && <p className="mt-0.5 truncate text-sm text-ink-soft">{meta.join(" · ")}</p>}
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">
            {showAuthor && item.username ? `${item.username} · ` : ""}
            {formatCompactTime(item.created_at)}
            {!displayItem.is_public && " · 비공개"}
          </p>
        </div>
      </Link>
    </div>
  )
}
