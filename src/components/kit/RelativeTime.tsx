"use client"

import { useHydrated } from "@/hooks/useHydrated"
import { formatCompactTime, timeAgo } from "@/lib/utils"

// 상대 시간(약 3시간 전). 서버와 첫 화면은 한국 시간 기준 날짜로 같게 그리고, 화면이 뜬 뒤 상대 시간으로 바꾼다
const DATE = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric" })

interface RelativeTimeProps {
	iso: string
	compact?: boolean
	className?: string
}

export function RelativeTime({ iso, compact = false, className }: RelativeTimeProps) {
	const hydrated = useHydrated()
	const absolute = DATE.format(new Date(iso))
	return (
		<time dateTime={iso} title={absolute} className={className}>
			{hydrated ? (compact ? formatCompactTime(iso) : timeAgo(iso)) : absolute}
		</time>
	)
}
