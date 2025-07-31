"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2, X, Camera, Clock, Book } from "lucide-react"
import ImageUploader from "@/components/common/ImageUploader"
import InstructionImageUploader from "@/components/recipe/InstructionImageUploader"
import CitedRecipeSearch from "@/components/recipe/CitedRecipeSearch"
import { OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"
import { RECIPE_COLOR_OPTIONS } from "@/lib/color-options"


import type { Item } from "@/types/item"
import { uploadImagesOptimized, ImageUploadMetrics } from "@/utils/image-optimization"
import { cacheManager } from "@/lib/unified-cache-manager"

// Zod 스키마 업데이트
const recipeSchema = z.object({
	title: z.string().min(3, "제목은 3글자 이상이어야 합니다."),
	description: z.string().optional(),
	servings: z.coerce.number().min(1, "인분은 1 이상이어야 합니다."),
	cooking_time_minutes: z.coerce.number().min(1, "조리시간은 1분 이상이어야 합니다."),
	is_public: z.boolean(),
	ingredients: z
		.array(
			z.object({
				name: z.string().min(1, "재료 이름을 입력하세요."),
				amount: z.coerce.number().positive("수량은 0보다 커야 합니다."),
				unit: z.string().min(1, "단위를 입력하세요."),
			})
		)
		.min(1, "재료를 하나 이상 추가해주세요."),
	instructions: z
		.array(
			z.object({
				description: z.string().min(1, "조리법 설명을 입력하세요."),
				image_url: z.string().optional(), // 조리법 이미지 URL
			})
		)
		.min(1, "조리법을 하나 이상 추가해주세요."),
	color_label: z.string().nullable().optional(),
	tags: z
		.string()
		.optional()
		.transform((str) =>
			str
				? str
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag.length > 0)
				: []
		)
		.pipe(z.array(z.string())),
	cited_recipe_ids: z.array(z.string()).optional(), // 참고 레시피 ID 배열
})

type RecipeFormValues = z.infer<typeof recipeSchema>

interface RecipeFormProps {
	initialData?: Item | null
	onNavigateBack?: (itemId?: string) => void // 🧭 스마트 네비게이션 콜백
}

export default function RecipeForm({ initialData, onNavigateBack }: RecipeFormProps) {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()

	const isEditMode = !!initialData

	// 디버깅: initialData 확인
	console.log("🔍 RecipeForm: initialData", initialData)
	console.log("🔍 RecipeForm: isEditMode", isEditMode)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [mainImages, setMainImages] = useState<OptimizedImage[]>([])
	const [thumbnailIndex, setThumbnailIndex] = useState(0)
	
	// 🚀 SSA: 섬네일 변경 시 즉시 캐시 업데이트를 위한 wrapper 함수
	const handleThumbnailChange = useCallback(async (newIndex: number) => {
		console.log(`🎯 RecipeForm: Thumbnail changing ${thumbnailIndex} → ${newIndex}`)
		setThumbnailIndex(newIndex)
		
		// 수정 모드이고 itemId가 있는 경우에만 즉시 캐시 업데이트
		if (isEditMode && initialData?.id) {
			try {
				const { data: { user } } = await supabase.auth.getUser()
				if (user) {
					const partialUpdate = {
						thumbnail_index: newIndex,
						// 기본 정보는 그대로 유지
						id: initialData.id,
						item_id: initialData.id,
					}
					
					console.log(`🚀 RecipeForm: Updating thumbnail_index in cache immediately`)
					await cacheManager.updateItem(initialData.id, partialUpdate)
					console.log(`✅ RecipeForm: Thumbnail cache updated successfully`)
					
					// 캐시 업데이트 후 상태 재확인
					setTimeout(() => {
						console.log(`🔍 RecipeForm: After cache update - thumbnailIndex: ${thumbnailIndex}, newIndex: ${newIndex}`)
					}, 100)
				}
			} catch (error) {
				console.error(`❌ RecipeForm: Failed to update thumbnail cache:`, error)
				// 캐시 업데이트 실패해도 UI 상태는 유지
			}
		}
	}, [thumbnailIndex, isEditMode, initialData?.id, supabase.auth])
	const [instructionImages, setInstructionImages] = useState<(OptimizedImage | null)[]>([])
	const [selectedCitedRecipes, setSelectedCitedRecipes] = useState<Item[]>([])

	const form = useForm<RecipeFormValues>({
		// @ts-expect-error - 복잡한 타입 변환으로 인한 일시적 타입 에러 무시
		resolver: zodResolver(recipeSchema),
		mode: "onChange",
		defaultValues: {
			title: "",
			description: "",
			servings: 1,
			cooking_time_minutes: 1,
			is_public: true,
			ingredients: [{ name: "", amount: 1, unit: "개" }],
			instructions: [{ description: "", image_url: "" }],
			color_label: null,
			// @ts-expect-error - tags 기본값 타입 변환
			tags: "",
			cited_recipe_ids: [],
		},
	})

	useEffect(() => {
		if (isEditMode && initialData) {
			form.reset({
				title: initialData.title || "",
				description: initialData.description || "",
				servings: initialData.servings || 1,
				cooking_time_minutes: initialData.cooking_time_minutes || 1,
				is_public: initialData.is_public !== undefined ? initialData.is_public : true,
				ingredients: (initialData.ingredients && initialData.ingredients.length > 0) ? initialData.ingredients.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit || "개" })) : [{ name: "", amount: 1, unit: "개" }],
				instructions: (initialData.instructions && initialData.instructions.length > 0) ? initialData.instructions.map((i) => ({ description: i.description, image_url: i.image_url || "" })) : [{ description: "", image_url: "" }],
				color_label: initialData.color_label,
				// @ts-expect-error - tags 타입 변환 처리
				tags: initialData.tags?.join(", ") || "",
				cited_recipe_ids: initialData.cited_recipe_ids || [],
			})

			if (initialData.image_urls && initialData.image_urls.length > 0) {
				const fetchedImages = initialData.image_urls.map((url) => ({
					file: new File([], url.split("/").pop() || "image"),
					preview: url,
					width: 800, // 기본값 설정
					height: 600, // 기본값 설정
				}))
				setMainImages(fetchedImages)
				// 🚀 업계 표준: 저장된 썸네일 인덱스 복원 또는 기본값(0) 사용
				const savedThumbnailIndex = initialData.thumbnail_index ?? 0
				setThumbnailIndex(Math.min(savedThumbnailIndex, fetchedImages.length - 1))
				console.log(`📌 Restored thumbnail index: ${savedThumbnailIndex} (available: ${fetchedImages.length})`)
			}

			if (initialData.instructions && initialData.instructions.length > 0) {
				const fetchedInstructionImages = initialData.instructions.map((i) =>
					i.image_url
						? {
								file: new File([], i.image_url.split("/").pop() || "instruction"),
								preview: i.image_url,
								width: 800,
								height: 600,
						  }
						: null
				)
				setInstructionImages(fetchedInstructionImages)
			}
			// Fetch cited recipes details if in edit mode
			if (initialData.cited_recipe_ids && initialData.cited_recipe_ids.length > 0) {
				const fetchCitedRecipes = async () => {
					const { data, error } = await supabase
						.from("items")
						.select(
							`
							id, 
							title, 
							item_type, 
							image_urls, 
							user_id, 
							created_at,
							author:profiles!items_user_id_fkey(
								display_name, 
								username, 
								public_id, 
								avatar_url
							)
						`
						)
						.in("id", initialData.cited_recipe_ids!)
						.eq("item_type", "recipe")

					if (error) {
						console.error("Error fetching cited recipes", error)
					} else {
						// 데이터 구조를 CitedRecipeSearch가 기대하는 형태로 변환
						const formattedRecipes = data.map((recipe) => {
							const authorProfile = Array.isArray(recipe.author) ? recipe.author[0] : recipe.author
							return {
								...recipe,
								item_id: recipe.id, // item_id 필드 추가
								display_name: authorProfile?.display_name || authorProfile?.username,
								username: authorProfile?.username,
								avatar_url: authorProfile?.avatar_url,
								user_public_id: authorProfile?.public_id,
							}
						})
						setSelectedCitedRecipes(formattedRecipes as unknown as Item[])
					}
				}
				fetchCitedRecipes()
			}
		}
	}, [initialData, isEditMode, form, supabase])

	const { fields: ingredients, append: appendIngredient, remove: removeIngredient } = useFieldArray({ control: form.control, name: "ingredients" })
	const { fields: instructions, append: appendInstruction, remove: removeInstruction } = useFieldArray({ control: form.control, name: "instructions" })

	const handleInstructionImageChange = (index: number, image: OptimizedImage | null) => {
		const newInstructionImages = [...instructionImages]
		newInstructionImages[index] = image
		setInstructionImages(newInstructionImages)
	}

	const handleSelectedCitedRecipesChange = (recipes: Item[]) => {
		setSelectedCitedRecipes(recipes)
		form.setValue(
			"cited_recipe_ids",
			recipes.map((r) => r.item_id) // item_id로 변경
		)
	}

	const onSubmit = async (values: RecipeFormValues) => {
		if (mainImages.length === 0) {
			toast({ title: "이미지 필요", description: "레시피 대표 이미지를 최소 1개 업로드해주세요.", variant: "destructive" })
			return
		}

		setIsSubmitting(true)

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser()
			if (!user) {
				toast({ title: "로그인 필요", description: `레시피를 ${isEditMode ? "수정" : "작성"}하려면 로그인이 필요합니다.`, variant: "destructive" })
				setIsSubmitting(false)
				return
			}

			const bucketId = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS
			if (!bucketId) {
				throw new Error("Supabase storage bucket ID is not configured.")
			}

					// 🚀 최적화된 메인 이미지 병렬 업로드 (기존: 순차 → 새로운: 병렬 + 캐싱)
		// 🚀 업계 표준: 원본 순서 유지 + 썸네일 인덱스 정보 저장 (개선된 Instagram/Facebook 방식)
		console.log(`📌 Preserving original image order with thumbnail index: ${thumbnailIndex}`)
		console.log(`📦 Images:`, mainImages.map((img, i) => `${i}: ${img.preview.split('/').pop()}`))

		const uploadStartTime = Date.now()
		const newImageFiles = mainImages.filter((img) => img.file.size > 0)
		const existingImageUrls = mainImages.filter((img) => !newImageFiles.includes(img)).map((img) => img.preview)
		
		let uploadedImageUrls: string[] = []
		if (newImageFiles.length > 0) {
			console.log(`📤 Uploading ${newImageFiles.length} recipe images in parallel...`)
			const uploadResults = await uploadImagesOptimized(
				newImageFiles, 
				user.id, 
				bucketId,
				(progress) => {
					console.log(`📊 Recipe upload progress: ${progress.uploaded}/${progress.total} (${progress.currentFile || ''})`)
				}
			)

			// 결과 검증 및 URL 추출
			uploadedImageUrls = uploadResults.map(result => {
				if (!result.success) {
					throw new Error(result.error || '레시피 이미지 업로드에 실패했습니다.')
				}
				return result.url
			})

			// 업로드 성능 메트릭 기록
			const uploadEndTime = Date.now()
			const uploadDuration = uploadEndTime - uploadStartTime
			
			newImageFiles.forEach(img => {
				ImageUploadMetrics.recordUpload(
					img.file.size, 
					uploadDuration / newImageFiles.length, 
					true, 
					false
				)
			})

			console.log(`✅ Recipe images upload completed in ${uploadDuration}ms`)
		}
		
					// 🚀 원본 순서 유지로 최종 URL 배열 생성
			const finalImageUrls = [...existingImageUrls, ...uploadedImageUrls]

			// Instruction images upload
			const uploadedInstructionImageUrls = await Promise.all(
				instructionImages.map(async (image, index) => {
					if (image && image.file.size > 0) {
						const fileName = `${user.id}/${Date.now()}-instruction-${index}-${Math.random()}`
						const { error: uploadError } = await supabase.storage.from(bucketId).upload(fileName, image.file)
						if (uploadError) throw new Error(`조리법 이미지 업로드 실패: ${uploadError.message}`)
						const { data: publicUrlData } = supabase.storage.from(bucketId).getPublicUrl(fileName)
						return publicUrlData.publicUrl
					} else if (image) {
						return image.preview
					} else {
						return null
					}
				})
			)

			const instructionsWithImages = values.instructions.map((inst, index) => ({
				...inst,
				image_url: uploadedInstructionImageUrls[index] || undefined,
			}))



			const itemPayload = {
				user_id: user.id,
				item_type: "recipe" as const,
				title: values.title,
				description: values.description,
				servings: values.servings,
				cooking_time_minutes: values.cooking_time_minutes,
				is_public: values.is_public,
				image_urls: finalImageUrls,
				color_label: values.color_label,
				tags: values.tags,
				cited_recipe_ids: values.cited_recipe_ids,
				thumbnail_index: thumbnailIndex, // 🚀 썸네일 인덱스 저장
			}

			let itemId: string

			if (isEditMode && initialData) {
				console.log("Updating existing recipe. initialData:", initialData) // 디버깅 로그
				const { data: updatedItem, error: itemError } = await supabase.from("items").update(itemPayload).eq("id", initialData.id).select("id").single() // initialData.item_id -> initialData.id로 변경
				if (itemError) throw new Error(`레시피 수정 실패: ${itemError.message}`)
				itemId = updatedItem.id
				console.log("Recipe updated. New itemId:", itemId) // 디버깅 로그

				await supabase.from("ingredients").delete().eq("item_id", itemId)
				await supabase.from("instructions").delete().eq("item_id", itemId)
			} else {
				console.log("Creating new recipe.") // 디버깅 로그
				const { data: newItem, error: itemError } = await supabase.from("items").insert(itemPayload).select("id").single()
				if (itemError) throw new Error(`레시피 생성 실패: ${itemError.message}`)
				itemId = newItem.id
				console.log("New recipe created. itemId:", itemId) // 디버깅 로그
			}

			const ingredientsToInsert = values.ingredients.map((ing) => ({ ...ing, item_id: itemId }))
			await supabase.from("ingredients").insert(ingredientsToInsert)

			const instructionsToInsert = instructionsWithImages.map((inst, index) => ({ ...inst, item_id: itemId, step_number: index + 1 }))
			await supabase.from("instructions").insert(instructionsToInsert)

			// 🚀 SSA 기반: 통합 캐시 관리로 최신 데이터 보장 (thumbnail_index 포함)
			if (isEditMode) {
				console.log(`🚀 RecipeForm: SSA update mode - using updateItem for immediate sync...`)
				// 🚀 SSA: 아이템 업데이트 - 홈화면에 즉시 반영!
				const fullItemPayload = {
					...itemPayload,
					id: itemId,
					item_id: itemId,
					ingredients: values.ingredients,
					instructions: instructionsWithImages.map((inst, index) => ({ 
						...inst, 
						step_number: index + 1 
					})),
					// 🔧 사용자 정보 추가 (optimized_feed_view 호환)
					display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
					username: user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
					avatar_url: user.user_metadata?.avatar_url || null,
					user_public_id: user.user_metadata?.public_id || null,
					// 🔧 초기 통계 값 (기존 값 유지)
					likes_count: initialData?.likes_count || 0,
					comments_count: initialData?.comments_count || 0,
					is_liked: initialData?.is_liked || false,
					is_following: initialData?.is_following || false,
					created_at: initialData?.created_at || new Date().toISOString(),
				}
				console.log(`🔍 RecipeForm: Updating with thumbnail_index: ${thumbnailIndex}`)
				console.log(`🔍 RecipeForm: fullItemPayload keys:`, Object.keys(fullItemPayload))
				console.log(`🔍 RecipeForm: Calling updateItem with itemId: "${itemId}" and payload:`, {
					id: fullItemPayload.id,
					item_id: fullItemPayload.item_id,
					title: fullItemPayload.title,
					thumbnail_index: fullItemPayload.thumbnail_index,
					image_urls: fullItemPayload.image_urls?.length || 0
				})
				await cacheManager.updateItem(itemId, fullItemPayload)
				
				// 🔧 Smart Fallback: 필요시에만 부분 무효화 (성능 개선)
				setTimeout(async () => {
					console.log(`🔄 RecipeForm: Smart fallback - revalidating home feed only`)
					await cacheManager.revalidateHomeFeed()
				}, 200)
				
				console.log(`✅ RecipeForm: SSA update completed - all caches synchronized`)
			} else {
				console.log(`🚀 RecipeForm: SSA creating recipe via addNewItem...`)
				const fullItemPayload = {
					...itemPayload,
					id: itemId,
					item_id: itemId,
					ingredients: values.ingredients,
					instructions: instructionsWithImages.map((inst, index) => ({ 
						...inst, 
						step_number: index + 1 
					})),
					// 🔧 사용자 정보 추가 (optimized_feed_view 호환) - PostForm과 동일
					display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
					username: user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
					avatar_url: user.user_metadata?.avatar_url || null,
					user_public_id: user.user_metadata?.public_id || null,
					// 🔧 초기 통계 값
					likes_count: 0,
					comments_count: 0,
					is_liked: false,
					is_following: false,
					created_at: new Date().toISOString(),
				}
				// 🚀 SSA: 새로운 레시피 추가 - 홈피드 맨 위에 즉시 표시!
				await cacheManager.addNewItem(fullItemPayload as Item)
			}

		console.log(`✅ RecipeForm: Recipe ${isEditMode ? "updated" : "created"} successfully with optimistic update: ${itemId}`)

		toast({ title: `레시피 ${isEditMode ? "수정" : "작성"} 완료`, description: `성공적으로 ${isEditMode ? "수정" : "등록"}되었습니다.` })
		
		// 🧭 스마트 네비게이션: 사용자가 온 곳으로 적절히 돌아가기
		if (onNavigateBack) {
			onNavigateBack(itemId)
		} else {
			// 폴백: 홈화면으로 이동 (새로운 아이템이 이미 캐시에 추가됨)
			router.push("/")
		}
	} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : "오류가 발생했습니다."
			toast({ title: `레시피 ${isEditMode ? "수정" : "작성"} 실패`, description: errorMessage, variant: "destructive" })
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="bg-white border-b sticky top-0 z-40">
				<div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
					<Button type="button" variant="ghost" onClick={() => router.back()}>
						취소
					</Button>
					<h1 className="text-lg font-semibold">{isEditMode ? "레시피 수정" : "새 레시피"}</h1>
					<div className="w-12" />
				</div>
			</div>

			<div className="max-w-md mx-auto p-4 space-y-6">
				{/* @ts-expect-error - form 핸들러 타입 변환 처리 */}
				<form id="recipe-form" onSubmit={form.handleSubmit(onSubmit, (errors) => console.log("Form validation errors:", errors))} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Camera className="w-5 h-5 text-orange-500" />
								레시피 이미지
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ImageUploader 
								images={mainImages} 
								onImagesChange={setMainImages} 
								maxImages={5} 
								placeholder="레시피 사진을 추가해주세요" 
								thumbnailIndex={thumbnailIndex} 
								onThumbnailChange={handleThumbnailChange} 
								showThumbnailSelector={true} 
								isEditMode={isEditMode} 
							/>
						</CardContent>
					</Card>

					<div>
						<Label htmlFor="title" className="text-base font-medium">
							레시피 제목
						</Label>
						<Input id="title" placeholder="예: 맛있는 김치찌개" className="mt-2 bg-white" {...form.register("title")} />
						{form.formState.errors.title && <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>}
					</div>

					<div>
						<Label htmlFor="description" className="text-base font-medium">
							레시피 설명
						</Label>
						<Textarea id="description" placeholder="레시피에 대한 간단한 설명을 입력하세요" className="mt-2 bg-white" {...form.register("description")} />
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="servings" className="text-base font-medium">
								인분
							</Label>
							<div className="flex items-center mt-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										const current = form.getValues("servings")
										if (current > 1) form.setValue("servings", current - 1, { shouldValidate: true })
									}}
									className="rounded-r-none">
									-
								</Button>
								<Input id="servings" type="number" min="1" className="rounded-none text-center bg-white" {...form.register("servings")} />
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										const current = form.getValues("servings")
										form.setValue("servings", current + 1, { shouldValidate: true })
									}}
									className="rounded-l-none">
									+
								</Button>
							</div>
							<span className="text-xs text-gray-500 mt-1 block">인분</span>
						</div>

						<div>
							<Label htmlFor="cooking_time_minutes" className="text-base font-medium flex items-center gap-1">
								<Clock className="w-4 h-4" />
								조리시간
							</Label>
							<div className="flex items-center gap-2 mt-2">
								<Input 
									id="cooking_time_minutes" 
									type="number" 
									min="1" 
									placeholder="30" 
									className="bg-white flex-1" 
									{...form.register("cooking_time_minutes")} 
								/>
								<span className="text-sm text-gray-600 font-medium">분</span>
							</div>
							{form.formState.errors.cooking_time_minutes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.cooking_time_minutes.message}</p>}
						</div>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>재료</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{ingredients.map((field, index) => (
								<div key={field.id} className="space-y-2">
									{/* 🎯 모바일 반응형: 390px 이하에서 2행 구성 */}
									<div className="flex flex-col sm:flex-row gap-2">
										{/* 첫 번째 행: 재료명 + 삭제버튼 (모바일) */}
										<div className="flex gap-2 sm:contents">
											<Input 
												placeholder="재료명 (예: 돼지고기)" 
												{...form.register(`ingredients.${index}.name`)} 
												className="flex-1 bg-white" 
											/>
											<Button 
												type="button" 
												variant="ghost" 
												size="icon" 
												onClick={() => removeIngredient(index)} 
												disabled={ingredients.length === 1} 
												className="p-2 shrink-0 sm:order-last"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
										{/* 두 번째 행: 재료양 + 단위 (모바일) */}
										<div className="flex gap-2 sm:contents">
											<Input 
												type="number" 
												placeholder="수량" 
												{...form.register(`ingredients.${index}.amount`)} 
												className="w-full sm:w-20 bg-white" 
											/>
											<Input 
												placeholder="단위 (예: g)" 
												{...form.register(`ingredients.${index}.unit`)} 
												className="w-full sm:w-24 bg-white" 
											/>
										</div>
									</div>
									{form.formState.errors.ingredients?.[index] && (
										<div className="text-red-500 text-sm px-1">
											{form.formState.errors.ingredients[index]?.name?.message && <p>{form.formState.errors.ingredients[index]?.name?.message}</p>}
											{form.formState.errors.ingredients[index]?.amount?.message && <p>{form.formState.errors.ingredients[index]?.amount?.message}</p>}
										</div>
									)}
								</div>
							))}
							<Button type="button" variant="outline" onClick={() => appendIngredient({ name: "", amount: 1, unit: "" })} className="w-full mt-4 bg-white">
								<PlusCircle className="mr-2 h-4 w-4" />
								재료 추가
							</Button>
							{form.formState.errors.ingredients?.root && <p className="text-red-500 text-sm mt-1">{form.formState.errors.ingredients.root.message}</p>}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>조리법</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{instructions.map((field, index) => (
								<div key={field.id} className="flex items-start gap-3">
									<div className="relative pt-1">
										<div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 z-10">{index + 1}</div>
										{instructions.length > 1 && (
											<Button type="button" variant="destructive" size="icon" onClick={() => removeInstruction(index)} className="absolute -top-1 -right-3 w-5 h-5 rounded-full z-20">
												<X className="h-3 w-3" />
											</Button>
										)}
									</div>
									<div className="flex-1 space-y-2">
										<InstructionImageUploader imageUrl={field.image_url} onImageChange={(image) => handleInstructionImageChange(index, image)} />
										<Textarea placeholder="조리 과정을 순서대로 설명해주세요" className="min-h-[80px] bg-white" {...form.register(`instructions.${index}.description`)} />
										{form.formState.errors.instructions?.[index]?.description && <p className="text-red-500 text-sm mt-1">{form.formState.errors.instructions[index].description.message}</p>}
									</div>
								</div>
							))}
							<Button type="button" variant="outline" onClick={() => appendInstruction({ description: "", image_url: "" })} className="w-full mt-4">
								<PlusCircle className="mr-2 h-4 w-4" />
								단계 추가
							</Button>
							{form.formState.errors.instructions?.root && <p className="text-red-500 text-sm mt-1">{form.formState.errors.instructions.root.message}</p>}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Book className="w-5 h-5 text-orange-500" />
								참고 레시피
							</CardTitle>
						</CardHeader>
						<CardContent>
							<CitedRecipeSearch selectedRecipes={selectedCitedRecipes} onSelectedRecipesChange={handleSelectedCitedRecipesChange} />
						</CardContent>
					</Card>

					<div>
						<Label htmlFor="tags" className="text-base font-medium">
							태그 (쉼표로 구분)
						</Label>
						<Input id="tags" placeholder="예: #김치찌개, #한식" className="mt-2 bg-white" {...form.register("tags")} />
						{form.formState.errors.tags && <p className="text-red-500 text-sm mt-1">{form.formState.errors.tags.message}</p>}
					</div>

					<div>
						<Label className="text-base font-medium">색상 라벨</Label>
						<div className="grid grid-cols-7 gap-2 mt-2">
							{RECIPE_COLOR_OPTIONS.map((colorOption) => (
								<Button
									key={colorOption.value}
									type="button"
									variant="outline"
									className={`
										w-10 h-10 p-0 rounded-xl border-2 transition-all duration-200
										${colorOption.color}
										${form.watch("color_label") === colorOption.value ? "ring-2 ring-orange-500 ring-offset-2 scale-110" : "hover:scale-105"}
                    focus-visible:ring-orange-500 focus-visible:ring-offset-2
									`}
									onClick={() => {
										const currentColor = form.getValues("color_label")
										form.setValue("color_label", currentColor === colorOption.value ? null : colorOption.value, { shouldValidate: true })
									}}>
									{form.watch("color_label") === colorOption.value}
								</Button>
							))}
						</div>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>공개 설정</CardTitle>
						</CardHeader>
						<CardContent>
							<Controller
								control={form.control}
								name="is_public"
								render={({ field }) => (
									<RadioGroup value={field.value.toString()} onValueChange={(value) => field.onChange(value === "true")} className="space-y-3">
										<div className="flex items-center space-x-3">
											<RadioGroupItem value="true" id="public" />
											<Label htmlFor="public" className="flex-1">
												<div className="font-medium">공개</div>
												<div className="text-sm text-gray-500">모든 사용자가 볼 수 있습니다</div>
											</Label>
										</div>
										<div className="flex items-center space-x-3">
											<RadioGroupItem value="false" id="private" />
											<Label htmlFor="private" className="flex-1">
												<div className="font-medium">비공개</div>
												<div className="text-sm text-gray-500">나만 볼 수 있습니다</div>
											</Label>
										</div>
									</RadioGroup>
								)}
							/>
						</CardContent>
					</Card>

					<div className="h-20" />
				</form>
			</div>

			<div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
				<div className="max-w-md mx-auto p-4">
					<Button type="submit" form="recipe-form" disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-medium rounded-md">
						{isSubmitting ? `레시피 ${isEditMode ? "수정" : "작성"} 중...` : `레시피 ${isEditMode ? "수정" : "작성"}하기`}
					</Button>
				</div>
			</div>
		</div>
	)
}
