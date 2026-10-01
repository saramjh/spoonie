import type { Item } from "@/types/item"
import { withRo } from "@/lib/josa"
import { IntentLink } from "@/components/kit"

interface SourceLineProps {
	recipes: Item[]
	creationOrigin?: Item["creation_origin"]
	className?: string
}

// 레시피드의 첫 줄: 어떤 레시피에서 나왔는지 (DESIGN.md Interface Grammar 1)
// 레시피 화면에서 "이 레시피로 만들었어요"로 쓴 글은 "만들었어요", 직접 고른 인용은 "참고한 레시피"
export default function SourceLine({ recipes, creationOrigin, className }: SourceLineProps) {
	if (recipes.length === 0) return null
	const cooked = creationOrigin === "recipe_detail" || creationOrigin === "cook_mode"
	const [first, ...rest] = recipes
	const author = Array.isArray(first.author) ? first.author[0] : first.author
	const name = `${author?.username || "익명"}의 ${first.title || "레시피"}`
	return (
		<p className={className}>
			<IntentLink href={`/recipes/${first.id}`} className="text-[15px] text-ink" onClick={(e) => e.stopPropagation()}>
				{cooked ? (
					<>
						<span className="font-semibold underline decoration-ink/30 underline-offset-4">{withRo(name)}</span>
						<span className="text-ink-soft"> 만들었어요</span>
					</>
				) : (
					<>
						<span className="text-ink-soft">참고한 레시피 </span>
						<span className="font-semibold underline decoration-ink/30 underline-offset-4">{name}</span>
					</>
				)}
			</IntentLink>
			{rest.length > 0 && <span className="text-sm text-ink-soft"> 외 {rest.length}개</span>}
		</p>
	)
}
