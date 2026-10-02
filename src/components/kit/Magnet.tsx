import { getMagnet } from "@/lib/color-options"
import { cn } from "@/lib/utils"

// 색상 라벨 자석: 주인의 정리 표시 (DESIGN.md Interface Grammar 3). 라벨이 없으면 아무것도 그리지 않는다
const SIZE = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-8 w-8" }

interface MagnetProps {
	color: string | null | undefined
	size?: keyof typeof SIZE
	className?: string
	// 버튼 안에 들어가 이름이 이미 읽히는 경우
	decorative?: boolean
}

export function Magnet({ color, size = "md", className, decorative = false }: MagnetProps) {
	const magnet = getMagnet(color)
	if (!magnet) return null
	return (
		<span
			role={decorative ? undefined : "img"}
			aria-label={decorative ? undefined : `색상 라벨 ${magnet.label}`}
			aria-hidden={decorative || undefined}
			className={cn("block rounded-full shadow-[0_2px_4px_rgb(var(--ink)/0.35)]", SIZE[size], className)}
			style={{ backgroundColor: magnet.hex }}
		/>
	)
}
