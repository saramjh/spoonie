import { forwardRef, type ElementType, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

// 문 판 위에 붙는 흰 종이 한 장. 레시피·목록·안내·폼 묶음 등 모든 내용 면의 기본 그릇이다 (DESIGN.md Interface Grammar)
type SheetProps = HTMLAttributes<HTMLElement> & {
	as?: ElementType
	pad?: "none" | "md" | "lg"
}

const PAD = { none: "", md: "px-4 py-5", lg: "px-5 py-6" }

export const Sheet = forwardRef<HTMLElement, SheetProps>(function Sheet({ as: Tag = "div", pad = "none", className, ...props }, ref) {
	return <Tag ref={ref} className={cn("rounded-[3px] bg-paper shadow-sheet", PAD[pad], className)} {...props} />
})
