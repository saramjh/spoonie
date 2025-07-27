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
import { PlusCircle, Trash2, X, Camera, Clock, Book, RotateCcw } from "lucide-react"
import ImageUploader from "@/components/common/ImageUploader"
import InstructionImageUploader from "@/components/recipe/InstructionImageUploader"
import CitedRecipeSearch from "@/components/recipe/CitedRecipeSearch"
import { OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"
import { RECIPE_COLOR_OPTIONS } from "@/lib/color-options"
import { useRefresh } from "@/contexts/RefreshContext"
import { useSWRConfig } from "swr"
import type { FeedItem } from "@/types/item"
import { uploadImagesOptimized, processExistingImages, ImageUploadMetrics } from "@/utils/image-optimization"

// 간단한 debounce 함수 정의
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
	let timeout: NodeJS.Timeout
	return ((...args: any[]) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => func(...args), wait)
	}) as T
}

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
				unit: z.string().optional(),
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
		),
	cited_recipe_ids: z.array(z.string()).optional(), // 참고 레시피 ID 배열
})

type RecipeFormValues = z.infer<typeof recipeSchema>

interface RecipeFormProps {
	initialData?: FeedItem | null
}

export default function RecipeForm({ initialData }: RecipeFormProps) {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()
	const { triggerRefresh } = useRefresh()
	const { mutate } = useSWRConfig()
	const isEditMode = !!initialData

	// 디버깅: initialData 확인
	console.log("🔍 RecipeForm: initialData", initialData)
	console.log("🔍 RecipeForm: isEditMode", isEditMode)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [mainImages, setMainImages] = useState<OptimizedImage[]>([])
	const [thumbnailIndex, setThumbnailIndex] = useState(0)
	const [instructionImages, setInstructionImages] = useState<(OptimizedImage | null)[]>([])
	const [selectedCitedRecipes, setSelectedCitedRecipes] = useState<FeedItem[]>([])

	const form = useForm<RecipeFormValues>({
		resolver: zodResolver(recipeSchema),
		mode: "onChange",
		defaultValues: {
			title: "",
			description: "",
			servings: 1,
			cooking_time_minutes: 1,
			is_public: true,
			ingredients: [{ name: "", amount: 1, unit: "" }],
			instructions: [{ description: "", image_url: "" }],
			color_label: null,
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
				ingredients: initialData.ingredients?.length > 0 ? initialData.ingredients.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit || "" })) : [{ name: "", amount: 1, unit: "" }],
				instructions: initialData.instructions?.length > 0 ? initialData.instructions.map((i) => ({ description: i.description, image_url: i.image_url || "" })) : [{ description: "", image_url: "" }],
				color_label: initialData.color_label,
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
						setSelectedCitedRecipes(formattedRecipes as unknown as FeedItem[])
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

	const handleSelectedCitedRecipesChange = (recipes: FeedItem[]) => {
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
		
		const finalImageUrls = [...existingImageUrls, ...uploadedImageUrls]
			const thumbnail = finalImageUrls.splice(thumbnailIndex, 1)[0]
			finalImageUrls.unshift(thumbnail)

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

			// 홈피드 캐시 무효화하여 새 레시피 즉시 반영 (강화된 버전)
			console.log(`🔄 RecipeForm: Invalidating home feed cache for new recipe ${itemId}`)
			
			// 1. SWR 캐시 무효화
			await mutate((key) => typeof key === "string" && key.startsWith("items|"))
			
			// 2. 홈화면 새로고침 트리거  
			await triggerRefresh("/")
			
			// 3. 추가 캐시 무효화 (optimized_feed_view 반영)
			await mutate("posts")
			await mutate("feed")
			await mutate("recipes")

			console.log(`✅ RecipeForm: Recipe ${isEditMode ? "updated" : "created"} successfully: ${itemId}`)

			toast({ title: `레시피 ${isEditMode ? "수정" : "작성"} 완료`, description: `성공적으로 ${isEditMode ? "수정" : "등록"}되었습니다.` })
			
			// 홈화면으로 이동 + 강제 새로고침
			router.push("/")
			router.refresh()
		} catch (error: any) {
			toast({ title: `레시피 ${isEditMode ? "수정" : "작성"} 실패`, description: error.message || "오류가 발생했습니다.", variant: "destructive" })
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="bg-white border-b sticky top-0 z-40">
				<div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
					<Button variant="ghost" onClick={() => router.back()}>
						취소
					</Button>
					<h1 className="text-lg font-semibold">{isEditMode ? "레시피 수정" : "새 레시피"}</h1>
					<div className="w-12" />
				</div>
			</div>

			<div className="max-w-md mx-auto p-4 space-y-6">
				<form id="recipe-form" onSubmit={form.handleSubmit(onSubmit, (errors) => console.log("Form validation errors:", errors))} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Camera className="w-5 h-5 text-orange-500" />
								레시피 이미지
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ImageUploader images={mainImages} onImagesChange={setMainImages} maxImages={5} placeholder="레시피 사진을 추가해주세요" thumbnailIndex={thumbnailIndex} onThumbnailChange={setThumbnailIndex} showThumbnailSelector={true} />
						</CardContent>
					</Card>

					<div>
						<Label htmlFor="title" className="text-base font-medium">
							레시피 제목
						</Label>
						<Input id="title" placeholder="예: 맛있는 김치찌개" className="mt-2" {...form.register("title")} />
						{form.formState.errors.title && <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>}
					</div>

					<div>
						<Label htmlFor="description" className="text-base font-medium">
							레시피 설명
						</Label>
						<Textarea id="description" placeholder="레시피에 대한 간단한 설명을 입력하세요" className="mt-2" {...form.register("description")} />
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
								<Input id="servings" type="number" min="1" className="rounded-none text-center" {...form.register("servings")} />
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
							<Input id="cooking_time_minutes" type="number" min="1" placeholder="30" className="mt-2" {...form.register("cooking_time_minutes")} />
							<span className="text-xs text-gray-500 mt-1 block">분</span>
							{form.formState.errors.cooking_time_minutes && <p className="text-red-500 text-sm mt-1">{form.formState.errors.cooking_time_minutes.message}</p>}
						</div>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>재료</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{ingredients.map((field, index) => (
								<div key={field.id} className="flex flex-col gap-2">
									<div className="flex items-start gap-2">
										<Input placeholder="재료명 (예: 돼지고기)" {...form.register(`ingredients.${index}.name`)} className="flex-1" />
										<Input type="number" placeholder="수량" {...form.register(`ingredients.${index}.amount`)} className="w-20" />
										<Input placeholder="단위 (예: g)" {...form.register(`ingredients.${index}.unit`)} className="w-24" />
										<Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)} disabled={ingredients.length === 1} className="p-2 shrink-0">
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
									{form.formState.errors.ingredients?.[index] && (
										<div className="text-red-500 text-sm px-1">
											{form.formState.errors.ingredients[index]?.name?.message && <p>{form.formState.errors.ingredients[index]?.name?.message}</p>}
											{form.formState.errors.ingredients[index]?.amount?.message && <p>{form.formState.errors.ingredients[index]?.amount?.message}</p>}
										</div>
									)}
								</div>
							))}
							<Button type="button" variant="outline" onClick={() => appendIngredient({ name: "", amount: 1, unit: "" })} className="w-full mt-4">
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
										<Textarea placeholder="조리 과정을 순서대로 설명해주세요" className="min-h-[80px]" {...form.register(`instructions.${index}.description`)} />
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
						<Input id="tags" placeholder="예: #김치찌개, #한식" className="mt-2" {...form.register("tags")} />
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
