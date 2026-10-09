"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/shared/lib/navigation"

// 하위 화면의 머리 막대: 왼쪽 되돌아가기(뒤로/취소), 가운데 제목, 오른쪽 행동 하나
interface PageHeaderProps {
	title: ReactNode
	leading?: "back" | "cancel" | "none"
	trailing?: ReactNode
	titleAlign?: "center" | "start"
	className?: string
	onCancel?: () => void
}

export function PageHeader({ title, leading = "back", trailing, titleAlign = "center", className, onCancel }: PageHeaderProps) {
	const router = useRouter()
	const back =
		leading === "back" ? (
			<Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="뒤로 가기">
				<ArrowLeft className="!size-6" aria-hidden />
			</Button>
		) : leading === "cancel" ? (
			<Button type="button" variant="ghost" onClick={onCancel ?? (() => router.back())} className="px-3">
				취소
			</Button>
		) : null

	// 가운데 제목은 양옆 폭과 상관없이 정확히 가운데 (3칸 격자)
	if (titleAlign === "center") {
		return (
			<header className={cn("sticky top-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-paper px-1", className)}>
				<div className="flex justify-start">{back}</div>
				<h1 className="truncate text-heading text-ink">{title}</h1>
				<div className="flex justify-end">{trailing}</div>
			</header>
		)
	}
	return (
		<header className={cn("sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-border bg-paper pr-1", back ? "pl-1" : "pl-4", className)}>
			{back}
			<h1 className="min-w-0 flex-1 truncate text-title text-ink">{title}</h1>
			{trailing}
		</header>
	)
}
