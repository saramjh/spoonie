import { ChevronRight } from "lucide-react"
import type { Item } from "@/types/item"
import { withRo } from "@/lib/josa"
import { cn } from "@/lib/utils"
import { IntentLink } from "./IntentLink"
import { Photo } from "./Photo"

// 레시피드의 출처: 이 기록이 나온 레시피로 가는 행 (성장 고리의 연결점, DESIGN.md Interface Grammar 1)
// 카드 안의 카드가 아니라 1px 선으로 나뉜 한 행이다. 썸네일·관계 동사·제목·작성자를 한눈에, 행 전체를 누르면 레시피로 간다.
interface SourceRowProps {
	recipes: Item[]
	creationOrigin?: Item["creation_origin"]
	className?: string
}

export function SourceRow({ recipes, creationOrigin, className }: SourceRowProps) {
	if (recipes.length === 0) return null
	const cooked = creationOrigin === "recipe_detail" || creationOrigin === "cook_mode"
	const [first, ...rest] = recipes
	const author = (Array.isArray(first.author) ? first.author[0] : first.author) as { username?: string } | undefined
	const authorName = author?.username || first.username || "익명"
	const thumb = first.image_urls?.[0]
	return (
		<IntentLink
			href={`/recipes/${first.id}`}
			onClick={(e) => e.stopPropagation()}
			className={cn("flex min-h-14 items-center gap-3 border-y border-border px-4 py-2", className)}
		>
			<span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-[2px] bg-muted">{thumb && <Photo src={thumb} sizes="40px" />}</span>
			<span className="min-w-0 flex-1">
				<span className="block text-[13px] text-ink-soft">
					{cooked ? `${authorName}의 레시피로 만들었어요` : `참고한 레시피 · ${authorName}`}
					{rest.length > 0 && ` 외 ${rest.length}개`}
				</span>
				<span className="block truncate text-[15px] font-semibold text-ink">{first.title || "레시피"}</span>
			</span>
			<ChevronRight className="h-5 w-5 flex-shrink-0 text-ink-soft" aria-hidden />
			<span className="sr-only">{cooked ? `${withRo(first.title || "레시피")} 만든 기록. 레시피 보기` : "참고한 레시피 보기"}</span>
		</IntentLink>
	)
}
