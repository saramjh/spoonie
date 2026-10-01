import type { ReactNode } from "react"
import { Sheet } from "./Sheet"

// 빈 상태·오류·안내: 종이 한 장에 무슨 일인지(제목), 왜/무엇을(본문), 다음 행동 하나 (DESIGN.md Interface Grammar 5)
interface StateSheetProps {
	title: string
	body?: ReactNode
	action?: ReactNode
	headingLevel?: "h1" | "h2" | "p"
	className?: string
}

export function StateSheet({ title, body, action, headingLevel: Heading = "p", className }: StateSheetProps) {
	return (
		<Sheet as="section" pad="lg" className={className}>
			<Heading className="text-[17px] font-semibold text-ink">{title}</Heading>
			{body && <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{body}</p>}
			{action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
		</Sheet>
	)
}
