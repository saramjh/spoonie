"use client"

import { useState, useEffect } from "react"
import { Ingredient, RecipeStep } from "@/types/item"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatQuantity } from "@/lib/utils"
import { Button } from "@/components/ui/button" // Import Button
import { Minus, Plus } from "lucide-react" // Import icons

interface RecipeContentViewProps {
	initialServings: number
	ingredients: Ingredient[]
	steps: RecipeStep[]
}

export default function RecipeContentView({ initialServings, ingredients, steps }: RecipeContentViewProps) {
	// Debug logging
	// RecipeContentView Debug: { initialServings, ingredientsLength, ingredients, stepsLength, steps }

	const [currentServings, setCurrentServings] = useState(initialServings)
	const [scaledIngredients, setScaledIngredients] = useState<Ingredient[]>([])
	const [referenceIngredientName, setReferenceIngredientName] = useState<string | undefined>(undefined)
	const [referenceIngredientTargetQuantity, setReferenceIngredientTargetQuantity] = useState<number | undefined>(undefined)

	// 탭 상태를 관리하는 state 추가
	const [activeTab, setActiveTab] = useState("servings")

	useEffect(() => {
		if (!ingredients || ingredients.length === 0) {
			setScaledIngredients([])
			return
		}

		let scaleFactor = 1

		if (activeTab === "ingredients" && referenceIngredientName && referenceIngredientTargetQuantity !== undefined) {
			const referenceIng = ingredients.find((ing) => ing.name === referenceIngredientName)
			if (referenceIng && referenceIng.amount > 0) {
				scaleFactor = referenceIngredientTargetQuantity / referenceIng.amount
			}
		} else {
			// activeTab === "servings" 또는 재료 기준 선택 안됨
			if (initialServings > 0) {
				scaleFactor = currentServings / initialServings
			}
		}

		const newScaledIngredients = ingredients.map((ing) => ({
			...ing,
			amount: ing.amount * scaleFactor,
		}))
		setScaledIngredients(newScaledIngredients)
	}, [currentServings, ingredients, initialServings, referenceIngredientName, referenceIngredientTargetQuantity, activeTab])

	const handleReferenceIngredientChange = (value: string) => {
		if (value === "servings_based") {
			setReferenceIngredientName(undefined)
			setReferenceIngredientTargetQuantity(undefined)
		} else {
			const selectedIng = ingredients.find((ing) => ing.name === value)
			setReferenceIngredientName(value)
			setReferenceIngredientTargetQuantity(selectedIng ? selectedIng.amount : undefined) // 선택된 재료의 기본량으로 설정
		}
	}

	const handleTabChange = (value: string) => {
		setActiveTab(value)
		// 탭 전환 시 스케일링 관련 상태 초기화
		if (value === "servings") {
			setCurrentServings(initialServings)
			setReferenceIngredientName(undefined)
			setReferenceIngredientTargetQuantity(undefined)
		} else if (value === "ingredients") {
			setCurrentServings(initialServings) // 인분 기준 탭으로 돌아갈 때를 대비하여 초기화
			// 재료 기준 탭으로 전환 시, 첫 번째 재료를 기본으로 선택하거나 초기화하지 않음
			// 사용자가 직접 재료를 선택하도록 유도
		}
	}

	const handleTargetQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseFloat(e.target.value)
		setReferenceIngredientTargetQuantity(isNaN(value) ? undefined : value)
	}

	return (
		<div className="space-y-6">
			<Tabs defaultValue="servings" className="w-full" onValueChange={handleTabChange}>
				<TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-xl">
					<TabsTrigger value="servings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-500 transition-all duration-200">
						인분 기준
					</TabsTrigger>
					<TabsTrigger value="ingredients" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-500 transition-all duration-200" disabled={!ingredients || ingredients.length === 0}>
						재료 기준
					</TabsTrigger>
				</TabsList>
				<TabsContent value="servings" className="mt-4 transition-all duration-300 data-[state=inactive]:opacity-0 data-[state=inactive]:translate-y-2">
					{/* Servings Slider */}
					<Card className="bg-white shadow-sm">
						<CardHeader>
							<CardTitle className="text-lg">인분 조절</CardTitle>
						</CardHeader>
						<CardContent className="p-6">
							<div className="flex flex-col items-center gap-4 mb-4">
								<span className="text-lg font-semibold">{currentServings}인분</span>
								<div className="flex items-center gap-4 w-full">
									<Button variant="outline" size="icon" onClick={() => setCurrentServings((prev) => Math.max(1, prev - 1))} disabled={currentServings <= 1} className="rounded-full">
										<Minus className="h-4 w-4" />
									</Button>
									<div className="relative flex-1">
										{activeTab === "ingredients" && <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-md z-10 text-sm text-gray-600 font-medium">재료 기준 스케일링 사용 중</div>}
										<Slider
											min={1}
											max={10}
											step={1}
											value={[currentServings]}
											onValueChange={(value) => {
												setCurrentServings(value[0])
												// 인분 조절 시 재료 기준 스케일링 초기화
												setReferenceIngredientName(undefined)
												setReferenceIngredientTargetQuantity(undefined)
											}}
											className="flex-1"
											disabled={activeTab === "ingredients"} // Disable slider if ingredient-based scaling is selected
										/>
									</div>
									<Button variant="outline" size="icon" onClick={() => setCurrentServings((prev) => Math.min(10, prev + 1))} disabled={currentServings >= 10} className="rounded-full">
										<Plus className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<p className="text-xs text-gray-500">슬라이더를 움직여 인분 수를 조절해보세요.</p>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="ingredients" className="mt-4 transition-all duration-300 data-[state=inactive]:opacity-0 data-[state=inactive]:translate-y-2">
					{/* Reference Ingredient Scaling */}
					<Card className="bg-white shadow-sm">
						<CardHeader>
							<CardTitle className="text-lg">특정 재료 기준 스케일링</CardTitle>
						</CardHeader>
						<CardContent className="p-6 space-y-4">
							{ingredients.length > 0 ? (
								<div className="grid w-full items-center gap-1.5">
									<Label htmlFor="reference-ingredient">기준 재료 선택</Label>
									<Select onValueChange={handleReferenceIngredientChange} value={referenceIngredientName || "servings_based"} disabled={activeTab === "servings"}>
										<SelectTrigger id="reference-ingredient">
											<SelectValue placeholder="기준 재료를 선택하세요" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="servings_based">기준 재료 선택</SelectItem>
											{ingredients
												.filter((ing) => ing.name !== "")
												.map((ing, index) => (
													<SelectItem key={index} value={ing.name}>
														{ing.name} ({ing.amount} {ing.unit})
													</SelectItem>
												))}
										</SelectContent>
									</Select>
									<p className="text-xs text-gray-500">특정 재료를 기준으로 재료들의 양을 조절합니다.</p>
								</div>
							) : (
								<p className="text-gray-500">등록된 재료가 없어 스케일링할 수 없습니다.</p>
							)}

							{referenceIngredientName && ingredients.length > 0 && (
								<div className="grid w-full items-center gap-1.5">
									<Label htmlFor="target-quantity">목표량 ({ingredients.find((ing) => ing.name === referenceIngredientName)?.unit})</Label>
									<Input type="number" id="target-quantity" placeholder="목표량을 입력하세요" value={referenceIngredientTargetQuantity || ""} onChange={handleTargetQuantityChange} step="0.1" disabled={activeTab === "servings"} />
									<p className="text-xs text-gray-500 mt-1">입력하신 양을 기준으로 모든 재료가 조절됩니다.</p>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Ingredients */}
			<Card className="bg-white shadow-sm">
				<CardHeader>
					<CardTitle className="text-lg">재료</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="space-y-3">
						{scaledIngredients.length > 0 ? (
							scaledIngredients.map((ing, index) => (
								<div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-orange-200 transition-colors bg-gradient-to-r from-gray-50/80 to-white">
									<div className="flex items-center gap-3">
										<span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
											{ing.name}
										</span>
									</div>
									<div className="flex items-center gap-1 text-gray-700 font-medium">
										<span className="text-lg">{formatQuantity(ing.amount)}</span>
										<span className="text-sm text-gray-500">{ing.unit}</span>
									</div>
								</div>
							))
						) : (
							<p className="text-gray-500 text-center py-4">등록된 재료가 없습니다.</p>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Steps */}
			<Card className="bg-white shadow-sm">
				<CardHeader>
					<CardTitle className="text-lg">조리법</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<ol className="space-y-6">
						{steps && steps.length > 0 ? (
							steps.map((step, index) => (
								<li key={index} className="w-full">
									<div className="flex flex-col space-y-3">
										{/* 단계 번호 */}
										<div className="flex items-center gap-3">
											<div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-orange-500 text-white font-bold text-sm">{index + 1}</div>
											<div className="h-px bg-gray-200 flex-1"></div>
										</div>

										{/* 이미지와 설명 */}
										<div className="w-full space-y-3">
											{step.image_url && (
												<div className="relative w-full h-48 rounded-xl overflow-hidden">
													              <Image 
                src={step.image_url} 
                alt={`Step ${step.order} image`} 
                fill 
                className="object-cover" 
                priority={step.order === 1}
              />
												</div>
											)}
											<p className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{step.description}</p>
										</div>
									</div>
								</li>
							))
						) : (
							<p className="text-gray-500">등록된 조리법이 없습니다.</p>
						)}
					</ol>
				</CardContent>
			</Card>
		</div>
	)
}
