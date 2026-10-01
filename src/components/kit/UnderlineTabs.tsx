import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// 보기 전환 탭: 대상 종류나 범위로 나눈다. 흑연 2px 밑줄 하나 (DESIGN.md Interface Grammar 2)
export interface TabItem<K extends string> {
	key: K
	label: ReactNode
	count?: number
}

interface UnderlineTabsProps<K extends string> {
	items: TabItem<K>[]
	value: K
	onChange: (key: K) => void
	label: string
	stretch?: boolean
	className?: string
}

export function UnderlineTabs<K extends string>({ items, value, onChange, label, stretch = true, className }: UnderlineTabsProps<K>) {
	return (
		<div role="tablist" aria-label={label} className={cn("flex border-b border-border bg-paper", className)}>
			{items.map((item) => (
				<button
					key={item.key}
					type="button"
					role="tab"
					aria-selected={value === item.key}
					onClick={() => onChange(item.key)}
					className={cn(
						"-mb-px h-12 border-b-2 px-4 text-[15px] font-semibold",
						stretch && "flex-1",
						value === item.key ? "border-ink text-ink" : "border-transparent text-ink-soft"
					)}
				>
					{item.label}
					{item.count !== undefined && <span className="font-medium tabular-nums"> {item.count}</span>}
				</button>
			))}
		</div>
	)
}
