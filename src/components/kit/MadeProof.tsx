import { cn } from "@/lib/utils"
import { Photo } from "./Photo"

// 레시피의 사회적 증거: 다른 사람이 실제로 만든 기록 (DESIGN.md Interface Grammar 5, 0이면 그리지 않는다)
// 만든 사진 동그라미를 겹쳐 놓고 "N명이 만들어 봤어요". 이어진 레시피가 있으면 함께 적는다.
interface MadeProofProps {
	madeCount?: number
	continuedCount?: number
	thumbs?: string[]
	className?: string
}

export function MadeProof({ madeCount = 0, continuedCount = 0, thumbs = [], className }: MadeProofProps) {
	if (madeCount <= 0 && continuedCount <= 0) return null
	const parts = [madeCount > 0 ? `${madeCount}명이 만들어 봤어요` : null, continuedCount > 0 ? `이어진 레시피 ${continuedCount}` : null].filter(Boolean)
	return (
		<span className={cn("flex items-center gap-2", className)}>
			{thumbs.length > 0 && (
				<span className="flex" aria-hidden>
					{thumbs.slice(0, 3).map((src, i) => (
						<span key={src} className={cn("relative h-6 w-6 overflow-hidden rounded-full bg-muted ring-2 ring-paper", i > 0 && "-ml-2")}>
							<Photo src={src} sizes="24px" />
						</span>
					))}
				</span>
			)}
			<span className="text-meta font-semibold text-ink">{parts.join(" · ")}</span>
		</span>
	)
}
