"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/lib/navigation"

// 하위 화면의 머리 막대: 왼쪽 되돌아가기(뒤로/취소), 가운데 제목, 오른쪽 행동 하나
interface PageHeaderProps {
	title: ReactNode
	leading?: "back" | "cancel" | "none"
	trailing?: ReactNode
	titleAlign?: "center" | "start"
	className?: string
}

export function PageHeader({ title, leading = "back", trailing, titleAlign = "center", className }: PageHeaderProps) {
	const router = useRouter()
	return (
		<header className={cn("sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-paper", titleAlign === "start" ? "pl-4 pr-1" : "px-1", className)}>
			{leading === "back" && (
				<Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="뒤로 가기">
					<ArrowLeft className="h-6 w-6" aria-hidden />
				</Button>
			)}
			{leading === "cancel" && (
				<Button type="button" variant="ghost" onClick={() => router.back()}>
					취소
				</Button>
			)}
			<h1 className={titleAlign === "start" ? "text-[22px] font-bold text-ink" : "text-[17px] font-semibold text-ink"}>{title}</h1>
			{trailing ?? (titleAlign === "center" ? <span className={leading === "cancel" ? "w-16" : "w-11"} aria-hidden /> : null)}
		</header>
	)
}
