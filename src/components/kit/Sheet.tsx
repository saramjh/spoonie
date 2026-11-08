import { forwardRef, type ElementType, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

// 승인된 목업의 종이색 내용 면. 상세와 폼은 호출부에서 모서리를 없애 연속된 면으로 쓴다.
type SheetProps = HTMLAttributes<HTMLElement> & {
	as?: ElementType
	pad?: "none" | "md" | "lg"
}

const PAD = { none: "", md: "px-4 py-5", lg: "px-5 py-6" }

export const Sheet = forwardRef<HTMLElement, SheetProps>(function Sheet({ as: Tag = "div", pad = "none", className, ...props }, ref) {
	return <Tag ref={ref} className={cn("rounded-[14px] bg-paper", PAD[pad], className)} {...props} />
})
