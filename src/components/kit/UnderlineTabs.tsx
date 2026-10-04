"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// 보기 전환 탭: 대상 종류나 범위로 나눈다. 흑연 2px 밑줄 하나 (DESIGN.md Interface Grammar 2)
export interface TabItem<K extends string> {
	key: K
	label: ReactNode
	count?: number
	description?: string
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
	const [openDescription, setOpenDescription] = useState<K | null>(null)

	return (
		<div role="tablist" aria-label={label} className={cn("flex border-b border-border bg-paper", className)}>
			{items.map((item, index) => {
				const descriptionId = item.description ? `tab-${item.key}-description` : undefined
				const descriptionOpen = Boolean(item.description && openDescription === item.key)

				return (
					<button
						key={item.key}
						type="button"
						role="tab"
						aria-selected={value === item.key}
						aria-describedby={descriptionId}
						onClick={() => onChange(item.key)}
						onMouseEnter={() => item.description && setOpenDescription(item.key)}
						onMouseLeave={(event) => {
							if (item.description && document.activeElement !== event.currentTarget) {
								setOpenDescription((current) => current === item.key ? null : current)
							}
						}}
						onFocus={() => item.description && setOpenDescription(item.key)}
						onBlur={() => item.description && setOpenDescription((current) => current === item.key ? null : current)}
						onPointerUp={(event) => {
							if (!item.description || event.pointerType === "mouse") return
							setOpenDescription(item.key)
							window.setTimeout(() => {
								setOpenDescription((current) => current === item.key ? null : current)
							}, 2200)
						}}
						className={cn(
							"-mb-px h-12 border-b-2 px-4 text-label font-semibold",
							item.description && "relative",
							stretch && "flex-1",
							value === item.key ? "border-ink text-ink" : "border-transparent text-ink-soft"
						)}
					>
						<span className={cn(item.description && "border-b border-dotted border-ink-soft")}>{item.label}</span>
						{item.count !== undefined && <span className="font-medium tabular-nums"> {item.count}</span>}
						{item.description && (
							<span
								id={descriptionId}
								role="tooltip"
								className={descriptionOpen
									? cn(
										"pointer-events-none absolute top-[calc(100%+6px)] z-[70] w-max max-w-[min(16rem,calc(100vw-24px))] rounded-md bg-ink px-3 py-2 text-left text-meta font-normal leading-snug text-paper shadow-sm",
										index === 0 ? "left-3" : index === items.length - 1 ? "right-3" : "left-1/2 -translate-x-1/2"
									)
									: "sr-only"
								}
							>
								{item.description}
							</span>
						)}
					</button>
				)
			})}
		</div>
	)
}
