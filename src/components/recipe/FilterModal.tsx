"use client"

import { Check } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRecipeStore } from "@/store/recipeStore"
import { ColorLabelPicker } from "@/components/kit"
import { cn } from "@/lib/utils"

interface FilterModalProps {
	isOpen: boolean
	onClose: () => void
}

// 정렬은 기준·순서 두 칸 대신, 사람이 실제로 고르는 순서 넷 중 하나
const SORTS = [
	{ key: "created_at:desc", label: "최근에 쓴 순" },
	{ key: "created_at:asc", label: "오래전에 쓴 순" },
	{ key: "updated_at:desc", label: "최근에 고친 순" },
	{ key: "title:asc", label: "이름순" },
] as const

/**
 * 나의 레시피 거르기·정렬. 고르면 바로 목록에 반영된다 (따로 "적용"을 누르지 않는다).
 * 색상 라벨이 이 창의 주인공이라 맨 위에 둔다 (DESIGN.md Interface Grammar 3).
 */
export function hasActiveRecipeFilter(state: { sortBy: string; sortOrder: string; filterCategory: string; filterColorLabel: string }) {
	return !!state.filterColorLabel || !!state.filterCategory || state.sortBy !== "created_at" || state.sortOrder !== "desc"
}

export default function FilterModal({ isOpen, onClose }: FilterModalProps) {
	const { setSortBy, setSortOrder, setFilterCategory, setFilterColorLabel, resetCurrentTabFilters, getCurrentTabState } = useRecipeStore()
	const state = getCurrentTabState()
	const sortKey = `${state.sortBy}:${state.sortOrder}`
	const active = hasActiveRecipeFilter(state)

	const chooseSort = (key: string) => {
		const [by, order] = key.split(":")
		setSortBy(by)
		setSortOrder(order as "asc" | "desc")
	}

	return (
		<Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DrawerContent className="mx-auto max-w-md">
				<div className="px-4 pb-4 pt-3">
					<DrawerTitle className="px-1 text-title text-ink">거르기와 정렬</DrawerTitle>
					<DrawerDescription className="sr-only">고르면 바로 목록에 반영돼요.</DrawerDescription>

					<section aria-labelledby="filter-color" className="mt-5">
						<h3 id="filter-color" className="px-1 text-heading text-ink">
							색상 라벨
						</h3>
						<ColorLabelPicker className="mt-1" value={state.filterColorLabel || null} onChange={(next) => setFilterColorLabel(next ?? "")} />
					</section>

					<section className="mt-5">
						<label htmlFor="filter-tag" className="block px-1 text-heading text-ink">
							태그
						</label>
						<Input id="filter-tag" className="mt-2" placeholder="예: 한식" value={state.filterCategory} onChange={(e) => setFilterCategory(e.target.value.trim())} />
					</section>

					<section aria-labelledby="filter-sort" className="mt-5">
						<h3 id="filter-sort" className="px-1 text-heading text-ink">
							정렬
						</h3>
						<div role="radiogroup" aria-labelledby="filter-sort" className="mt-1 divide-y divide-border">
							{SORTS.map((sort) => {
								const selected = sort.key === sortKey
								return (
									<button
										key={sort.key}
										type="button"
										role="radio"
										aria-checked={selected}
										onClick={() => chooseSort(sort.key)}
										className={cn("flex h-12 w-full items-center justify-between px-1 text-left text-body", selected ? "font-semibold text-ink" : "text-ink")}
									>
										{sort.label}
										{selected && <Check className="h-5 w-5 text-ink" strokeWidth={2.5} aria-hidden />}
									</button>
								)
							})}
						</div>
					</section>

					<div className="mt-5 flex gap-2">
						<Button variant="ghost" onClick={resetCurrentTabFilters} disabled={!active} className="flex-1">
							처음대로
						</Button>
						<Button onClick={onClose} className="flex-1">
							완료
						</Button>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	)
}
