import { Images } from "lucide-react"
import { cn } from "@/lib/utils"

// 사진이 여러 장인 글의 표시. 격자·카드 썸네일 오른쪽 위에 겹친 사진 아이콘과 장수를 둔다 (한 장이면 그리지 않는다)
export function PhotoCount({ count, className }: { count: number; className?: string }) {
	if (count < 2) return null
	return (
		<span
			role="img"
			aria-label={`사진 ${count}장`}
			className={cn("absolute right-1.5 top-1.5 z-10 flex items-center gap-1 rounded-[3px] bg-ink/70 px-1.5 py-0.5 text-micro tabular-nums text-paper", className)}
		>
			<Images className="h-3 w-3" aria-hidden />
			{count}
		</span>
	)
}
