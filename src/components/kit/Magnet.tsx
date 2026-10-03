import { getMagnet } from "@/features/recipe/domain/color-options"
import { cn } from "@/lib/utils"

// 색상 라벨 자석: 주인의 정리 표시 (DESIGN.md Interface Grammar 3). 라벨이 없으면 아무것도 그리지 않는다.
// 납작한 단추 자석: 위에서 비치는 빛 한 점, 아래쪽 옆면 두께, 종이 위에 뜬 짧은 그림자
const SIZE = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }

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
			className={cn(
				"block rounded-full bg-[radial-gradient(circle_at_38%_32%,rgb(255_255_255/0.45)_0,transparent_46%)]",
				"shadow-[inset_0_-2px_0_rgb(0_0_0/0.22),inset_0_0_0_1px_rgb(0_0_0/0.1),0_2px_3px_-1px_rgb(var(--ink)/0.45),0_6px_10px_-6px_rgb(var(--ink)/0.5)]",
				SIZE[size],
				className
			)}
			style={{ backgroundColor: magnet.hex }}
		/>
	)
}
