"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Search, Plus, X, Clock } from "lucide-react"
import debounce from "lodash.debounce"

interface Recipe {
	id: string
	title: string
	username: string
}

interface SelectedRecipe {
	id: string
	title: string
}

interface MultiRecipeCitationModalProps {
	isOpen: boolean
	onClose: () => void
	onRecipesSelect: (recipes: SelectedRecipe[]) => void
	selectedRecipes?: SelectedRecipe[]
	maxSelections?: number
}

export default function MultiRecipeCitationModal({ isOpen, onClose, onRecipesSelect, selectedRecipes = [], maxSelections = 5 }: MultiRecipeCitationModalProps) {
	const [searchQuery, setSearchQuery] = useState("")
	const [results, setResults] = useState<Recipe[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [tempSelectedRecipes, setTempSelectedRecipes] = useState<SelectedRecipe[]>(selectedRecipes)
	const supabase = createSupabaseBrowserClient()

	const searchRecipes = async (query: string) => {
		if (query.length < 2) {
			setResults([])
			return
		}

		setIsLoading(true)
		const { data, error } = await supabase
			.from("items")
			.select(`
				id, title,
				author:profiles!items_user_id_fkey(username)
			`)
			.eq("item_type", "recipe")
			.eq("is_public", true)
			.ilike("title", `%${query}%`)
			.limit(20)

		if (error) {
			console.error("Error searching recipes:", error)
			setResults([])
		} else {
			// 데이터 변환: author.username을 recipe.username으로 매핑
			const formattedData = data.map(item => ({
				id: item.id,
				title: item.title,
				username: (item.author as any)?.username || '익명'
			}))
			setResults(formattedData)
		}
		setIsLoading(false)
	}

	const debouncedSearch = useCallback(debounce(searchRecipes, 300), [supabase])

	useEffect(() => {
		debouncedSearch(searchQuery)
		return () => {
			debouncedSearch.cancel()
		}
	}, [searchQuery, debouncedSearch])

	useEffect(() => {
		setTempSelectedRecipes(selectedRecipes)
	}, [selectedRecipes, isOpen])

	const handleRecipeToggle = (recipe: Recipe) => {
		const isSelected = tempSelectedRecipes.some((r) => r.id === recipe.id)

		if (isSelected) {
			// 제거
			setTempSelectedRecipes((prev) => prev.filter((r) => r.id !== recipe.id))
		} else {
			// 추가 (최대 개수 확인)
			if (tempSelectedRecipes.length >= maxSelections) {
				return
			}
			setTempSelectedRecipes((prev) => [...prev, { id: recipe.id, title: recipe.title }])
		}
	}

	const handleRemoveSelected = (recipeId: string) => {
		setTempSelectedRecipes((prev) => prev.filter((r) => r.id !== recipeId))
	}

	const handleConfirm = () => {
		onRecipesSelect(tempSelectedRecipes)
		onClose()
	}

	const handleCancel = () => {
		setTempSelectedRecipes(selectedRecipes)
		setSearchQuery("")
		setResults([])
		onClose()
	}

	const isRecipeSelected = (recipeId: string) => {
		return tempSelectedRecipes.some((r) => r.id === recipeId)
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleCancel}>
			<DialogContent className="max-w-md max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>참고 레시피 선택</DialogTitle>
					<DialogDescription>최대 {maxSelections}개의 참고 레시피를 선택할 수 있습니다.</DialogDescription>
				</DialogHeader>

				<div className="flex-1 flex flex-col space-y-4">
					{/* 선택된 레시피들 */}
					{tempSelectedRecipes.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-medium text-gray-700">
								선택된 참고 레시피 ({tempSelectedRecipes.length}/{maxSelections})
							</h4>
							<div className="space-y-2 max-h-20 overflow-y-auto">
								{tempSelectedRecipes.map((recipe) => (
									<div key={recipe.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-md">
										<span className="text-sm font-medium truncate flex-1 mr-2">{recipe.title}</span>
										<Button variant="ghost" size="sm" onClick={() => handleRemoveSelected(recipe.id)} className="h-6 w-6 p-0 text-gray-500 hover:text-red-500">
											<X className="h-3 w-3" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* 검색 입력 */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
						<Input type="text" placeholder="레시피 제목으로 검색하세요..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
					</div>

					{/* 검색 결과 */}
					<div className="flex-1 min-h-0">
						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<Clock className="h-6 w-6 animate-spin text-gray-400" />
							</div>
						) : results.length > 0 ? (
							<div className="space-y-2 max-h-60 overflow-y-auto">
								{results.map((recipe) => {
									const isSelected = isRecipeSelected(recipe.id)
									const canSelect = !isSelected && tempSelectedRecipes.length < maxSelections

									return (
										<Card key={recipe.id} className={`cursor-pointer transition-colors ${isSelected ? "bg-orange-100 border-orange-300" : canSelect ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"}`} onClick={() => (canSelect || isSelected ? handleRecipeToggle(recipe) : undefined)}>
											<CardContent className="p-3">
												<div className="flex items-center justify-between">
													<div className="flex-1 min-w-0">
														<h3 className="font-medium text-sm truncate">{recipe.title}</h3>
														<p className="text-xs text-gray-500">by {recipe.username}</p>
													</div>
													{isSelected ? (
														<Badge variant="secondary" className="ml-2 bg-orange-500 text-white">
															선택됨
														</Badge>
													) : canSelect ? (
														<Plus className="h-4 w-4 text-gray-400 ml-2" />
													) : (
														<span className="text-xs text-gray-400 ml-2">제한</span>
													)}
												</div>
											</CardContent>
										</Card>
									)
								})}
							</div>
						) : searchQuery.length >= 2 ? (
							<div className="text-center py-8 text-gray-500">
								<p className="text-sm">검색 결과가 없습니다.</p>
								<p className="text-xs mt-1">다른 키워드로 검색해보세요.</p>
							</div>
						) : (
							<div className="text-center py-8 text-gray-500">
								<Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
								<p className="text-sm">레시피 제목으로 검색하세요</p>
								<p className="text-xs mt-1">최소 2글자 이상 입력해주세요</p>
							</div>
						)}
					</div>
				</div>

				{/* 액션 버튼 */}
				<div className="flex gap-2 pt-4 border-t">
					<Button variant="outline" onClick={handleCancel} className="flex-1">
						취소
					</Button>
					<Button onClick={handleConfirm} className="flex-1">
						선택 완료 ({tempSelectedRecipes.length})
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
