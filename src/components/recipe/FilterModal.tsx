"use client"

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useRecipeStore } from "@/store/recipeStore"
import { ColorLabelPicker } from "@/components/kit"

interface FilterModalProps {
	isOpen: boolean
	onClose: () => void
}

export default function FilterModal({ isOpen, onClose }: FilterModalProps) {
	const { 
		setSortBy, 
		setSortOrder, 
		setFilterCategory, 
		setFilterColorLabel, 
		resetCurrentTabFilters,
		getCurrentTabState 
	} = useRecipeStore()

	// 현재 탭의 상태를 가져옴
	const currentTabState = getCurrentTabState()
	const { sortBy, sortOrder, filterCategory, filterColorLabel } = currentTabState

	const handleApply = () => {
		onClose()
	}

	const handleReset = () => {
		resetCurrentTabFilters()
	}

			return (
			<Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
				<DrawerContent className="sm:max-w-md sm:mx-auto">
					<div className="mx-auto w-full p-4">
					<DrawerHeader>
						<DrawerTitle>레시피 필터 및 정렬</DrawerTitle>
						<DrawerDescription>원하는 레시피를 찾기 위해 조건을 설정하세요.</DrawerDescription>
					</DrawerHeader>
					<div className="space-y-6 p-4">
						{/* 태그 필터 */}
						<div>
							<label htmlFor="filter-category" className="block text-sm font-medium text-ink mb-2">
								태그 필터
							</label>
							<Input 
								id="filter-category" 
								type="text" 
								placeholder="태그 입력 (예: 한식)" 
								value={filterCategory} 
								onChange={(e) => setFilterCategory(e.target.value)} 
								className="w-full" 
							/>
						</div>

						{/* 색상 라벨 필터 */}
						<div>
							<p className="mb-1 block text-sm font-medium text-ink">색상 라벨</p>
							<ColorLabelPicker value={filterColorLabel || null} onChange={(next) => setFilterColorLabel(next ?? "")} />
						</div>

						{/* 정렬 기준 */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label htmlFor="sort-by" className="block text-sm font-medium text-ink mb-2">
									정렬 기준
								</label>
								<Select onValueChange={(value: string) => setSortBy(value)} defaultValue={sortBy}>
									<SelectTrigger id="sort-by">
										<SelectValue placeholder="정렬 기준" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="created_at">생성일</SelectItem>
										<SelectItem value="updated_at">수정일</SelectItem>
										<SelectItem value="title">제목</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* 정렬 순서 */}
							<div>
								<label htmlFor="sort-order" className="block text-sm font-medium text-ink mb-2">
									정렬 순서
								</label>
								<Select onValueChange={(value: "asc" | "desc") => setSortOrder(value)} defaultValue={sortOrder}>
									<SelectTrigger id="sort-order">
										<SelectValue placeholder="정렬 순서" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="desc">내림차순</SelectItem>
										<SelectItem value="asc">오름차순</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
					<DrawerFooter className="pt-4 flex-row gap-2">
						<Button variant="outline" onClick={handleReset} className="flex-1">
							초기화
						</Button>
						<Button onClick={handleApply} className="flex-1">
							적용
						</Button>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	)
}
