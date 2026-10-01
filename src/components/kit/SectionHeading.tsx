import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

// 종이 안 섹션의 머리: 굵은 제목과 옅은 개수 (예: "재료 14", "만드는 법 7단계")
interface SectionHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
	count?: ReactNode
	as?: "h2" | "h3"
}

export function SectionHeading({ count, as: Tag = "h2", className, children, ...props }: SectionHeadingProps) {
	return (
		<Tag className={cn("text-lg font-bold text-ink", className)} {...props}>
			{children}
			{count !== undefined && count !== null && count !== false && <span className="font-medium tabular-nums text-ink-soft"> {count}</span>}
		</Tag>
	)
}
