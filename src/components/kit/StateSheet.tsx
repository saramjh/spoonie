import type { ReactNode } from "react"
import { Lock } from "lucide-react"
import { Sheet } from "./Sheet"
import { cn } from "@/lib/utils"

// 빈 상태·오류·안내: 종이 한 장에 무슨 일인지(제목), 왜/무엇을(본문), 다음 행동 하나 (DESIGN.md Interface Grammar 5)
interface StateSheetProps {
	title: string
	body?: ReactNode
	action?: ReactNode
	headingLevel?: "h1" | "h2" | "p"
	className?: string
	variant?: "default" | "locked"
}

export function StateSheet({ title, body, action, headingLevel: Heading = "p", className, variant = "default" }: StateSheetProps) {
	if (variant === "locked") {
		return (
			<section className={cn("mx-auto mt-[86px] max-w-sm text-center", className)}>
				<Lock className="mx-auto h-9 w-9 text-ink-soft" strokeWidth={1.8} aria-hidden />
				<Heading className="mt-8 text-title font-semibold text-ink">{title}</Heading>
				{body && <p className="mx-auto mt-3 max-w-[295px] text-body leading-relaxed text-ink-soft">{body}</p>}
				{action && <div className="mt-4 flex justify-center">{action}</div>}
			</section>
		)
	}
	return (
		<Sheet as="section" pad="lg" className={className}>
			<Heading className="text-heading text-ink">{title}</Heading>
			{body && <p className="mt-1 text-body text-ink-soft">{body}</p>}
			{action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
		</Sheet>
	)
}
