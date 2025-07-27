"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera } from "lucide-react"
import ImageUploader from "@/components/common/ImageUploader"
import { OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"
import type { FeedItem } from "@/types/item"
import CitedRecipeSearch from "@/components/recipe/CitedRecipeSearch"
import { useRefresh } from "@/contexts/RefreshContext"
import { useSWRConfig } from "swr"
import { uploadImagesOptimized, processExistingImages, ImageUploadMetrics } from "@/utils/image-optimization"

interface PostFormProps {
	isEditMode?: boolean
	initialData?: FeedItem
}

const postSchema = z.object({
	title: z.string().min(1, "제목을 입력해주세요"),
	content: z.string().min(1, "내용을 입력해주세요"),
	tags: z.array(z.string()).optional(),
	cited_recipe_ids: z.array(z.string().min(1, "참고 레시피 ID는 비어있을 수 없습니다")).optional(),
})

type PostFormValues = z.infer<typeof postSchema>

export default function PostForm({ isEditMode = false, initialData }: PostFormProps) {
	const router = useRouter()
	const { toast } = useToast()
	const supabase = createSupabaseBrowserClient()
	const { triggerRefresh } = useRefresh()
	const { mutate } = useSWRConfig()

	// 디버깅: 데이터 전달 상황 확인
	console.log("🔍 PostForm: isEditMode", isEditMode)
	console.log("🔍 PostForm: initialData", initialData)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [mainImages, setMainImages] = useState<OptimizedImage[]>([])
	const [selectedCitedRecipes, setSelectedCitedRecipes] = useState<FeedItem[]>([])

	const form = useForm<PostFormValues>({
		resolver: zodResolver(postSchema),
		mode: "onChange",
		defaultValues: {
			title: "",
			content: "",
			tags: [],
			cited_recipe_ids: [],
		},
	})

	useEffect(() => {
		if (isEditMode && initialData) {
			// 안전한 cited_recipe_ids 처리
			const safeCitedRecipeIds = Array.isArray(initialData.cited_recipe_ids) 
				? initialData.cited_recipe_ids.map(id => String(id)).filter(id => id !== "")
				: []
			
			console.log("🔍 PostForm: Initializing edit mode with cited_recipe_ids:", safeCitedRecipeIds)
			
			form.reset({
				title: initialData.title || "",
				content: initialData.content || "",
				tags: initialData.tags || [],
				cited_recipe_ids: safeCitedRecipeIds,
			})

			if (initialData.image_urls) {
				const fetchedImages = initialData.image_urls.map(
					(url): OptimizedImage => ({
					file: new File([], url.split("/").pop()!),
					preview: url,
						width: 800,
						height: 600,
					})
				)
				setMainImages(fetchedImages)
			}

			// 참고 레시피 초기화
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
						const formattedRecipes = data.map((recipe) => {
							const authorProfile = Array.isArray(recipe.author) ? recipe.author[0] : recipe.author
							return {
								...recipe,
								item_id: recipe.id,
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
	}, [isEditMode, initialData, form, supabase])

	// 폼 에러 핸들러 추가
	const onError = (errors: Record<string, unknown>) => {
		console.log("❌ PostForm: Validation errors:", errors)
		console.log("🔍 PostForm: Form state:", form.formState)
		console.log("🔍 PostForm: Form values:", form.getValues())
		console.log("🔍 PostForm: cited_recipe_ids type:", typeof form.getValues("cited_recipe_ids"))
		console.log("🔍 PostForm: cited_recipe_ids value:", form.getValues("cited_recipe_ids"))
		console.log("🔍 PostForm: selectedCitedRecipes:", selectedCitedRecipes)
		
		// 각 에러 항목별 상세 정보
		Object.entries(errors).forEach(([field, error]) => {
			console.log(`🔍 PostForm: Error in ${field}:`, error)
		})
		
		toast({
			title: "입력 오류",
			description: "필수 항목을 모두 입력해주세요.",
			variant: "destructive"
		})
	}

	const onSubmit = async (values: PostFormValues) => {
		console.log("🚀 PostForm: onSubmit called with values:", values)
		console.log("🔍 PostForm: mainImages count:", mainImages.length)
		console.log("🔍 PostForm: Form is valid:", form.formState.isValid)
		
		setIsSubmitting(true)
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser()

			if (!user) {
				throw new Error("로그인이 필요합니다.")
			}

			console.log("✅ PostForm: User authenticated:", user.id)

					const bucketId = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS
			
			console.log("🔍 PostForm: bucketId:", bucketId)
			
			if (!bucketId) {
				throw new Error("Storage bucket ID가 설정되지 않았습니다.")
			}

		// 🚀 최적화된 병렬 이미지 업로드 (기존: 순차 → 새로운: 병렬 + 캐싱)
		const uploadStartTime = Date.now()
		let uploadedImageUrls: string[] = []

		if (isEditMode && initialData) {
			// 수정 모드: 기존 이미지와 새 이미지 구분 처리
			const { imagesToUpload, finalUrls } = processExistingImages(mainImages, initialData.image_urls || [])
			
			if (imagesToUpload.length > 0) {
				console.log(`📤 Uploading ${imagesToUpload.length} new images in parallel...`)
				const uploadResults = await uploadImagesOptimized(
					imagesToUpload, 
					user.id, 
					bucketId,
					(progress) => {
						console.log(`📊 Upload progress: ${progress.uploaded}/${progress.total} (${progress.currentFile || ''})`)
					}
				)

				// 업로드 결과를 최종 URL 배열에 병합
				let uploadIndex = 0
				uploadedImageUrls = finalUrls.map(url => {
					if (url === '') {
						// 새로 업로드된 이미지 URL로 교체
						const result = uploadResults[uploadIndex++]
						if (!result.success) {
							throw new Error(result.error || '이미지 업로드에 실패했습니다.')
						}
						return result.url
					}
					return url
				})
			} else {
				// 새로 업로드할 이미지가 없는 경우
				uploadedImageUrls = finalUrls
			}
		} else {
			// 생성 모드: 모든 이미지를 새로 업로드
			const imagesToUpload = mainImages.filter(img => img.file.size > 0)
			
			if (imagesToUpload.length > 0) {
				console.log(`📤 Uploading ${imagesToUpload.length} images in parallel...`)
				const uploadResults = await uploadImagesOptimized(
					imagesToUpload, 
					user.id, 
					bucketId,
					(progress) => {
						console.log(`📊 Upload progress: ${progress.uploaded}/${progress.total} (${progress.currentFile || ''})`)
					}
				)

				// 결과 검증 및 URL 추출
				uploadedImageUrls = uploadResults.map(result => {
					if (!result.success) {
						throw new Error(result.error || '이미지 업로드에 실패했습니다.')
					}
					return result.url
				})
			}
		}

		// 업로드 성능 메트릭 기록
		const uploadEndTime = Date.now()
		const uploadDuration = uploadEndTime - uploadStartTime
		
		// 각 이미지의 평균 크기와 시간을 기록
		mainImages.forEach(img => {
			if (img.file.size > 0) {
				ImageUploadMetrics.recordUpload(
					img.file.size, 
					uploadDuration / mainImages.length, 
					true, 
					false
				)
			}
		})

		console.log(`✅ Optimized upload completed in ${uploadDuration}ms for ${uploadedImageUrls.length} images`)

			const itemPayload = {
				user_id: user.id,
				item_type: "post" as const,
				title: values.title,
				content: values.content,
				image_urls: uploadedImageUrls,
				tags: values.tags,
				cited_recipe_ids: values.cited_recipe_ids,
			}

			let itemId: string

			if (isEditMode && initialData) {
				const { data: updatedItem, error: itemError } = await supabase.from("items").update(itemPayload).eq("id", initialData.id).select("id").single()

				if (itemError) throw new Error(`게시물 수정 실패: ${itemError.message}`)
				itemId = updatedItem.id
			} else {
				const { data: newItem, error: itemError } = await supabase.from("items").insert(itemPayload).select("id").single()

				if (itemError) throw new Error(`게시물 생성 실패: ${itemError.message}`)
				itemId = newItem.id
			}

			// 홈피드 캐시 무효화하여 새 게시물 즉시 반영 (강화된 버전)
			console.log(`🔄 PostForm: Invalidating home feed cache for new post ${itemId}`)
			
			// 1. SWR 캐시 무효화
			await mutate((key) => typeof key === "string" && key.startsWith("items|"))
			
			// 2. 홈화면 새로고침 트리거  
			await triggerRefresh("/")
			
			// 3. 추가 캐시 무효화 (optimized_feed_view 반영)
			await mutate("posts")
			await mutate("feed")

			console.log(`✅ PostForm: Post ${isEditMode ? "updated" : "created"} successfully: ${itemId}`)
			
			toast({
				title: `게시물 ${isEditMode ? "수정" : "작성"} 완료!`,
				description: "게시물이 성공적으로 처리되었습니다.",
			})
			
			// 홈화면으로 이동 + 강제 새로고침
			router.push("/")
			router.refresh()
		} catch (error) {
			console.error("Post submission error:", error)
			toast({
				title: `게시물 ${isEditMode ? "수정" : "작성"} 실패`,
				description: error instanceof Error ? error.message : "오류가 발생했습니다.",
				variant: "destructive",
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			<div className="bg-white border-b sticky top-0 z-40">
				<div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
					<Button variant="ghost" onClick={() => router.back()}>
						취소
					</Button>
					<h1 className="text-lg font-semibold">{isEditMode ? "게시물 수정" : "새 게시물"}</h1>
					<div className="w-12" />
				</div>
			</div>

			<div className="max-w-md mx-auto p-4 space-y-6">
				<form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Camera className="w-5 h-5 text-orange-500" />
								게시물 이미지
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ImageUploader images={mainImages} onImagesChange={setMainImages} maxImages={5} placeholder="사진을 추가해주세요" />
						</CardContent>
					</Card>

					<div className="space-y-4">
					<div>
							<Input {...form.register("title")} placeholder="제목을 입력하세요" className="text-lg font-semibold" />
						{form.formState.errors.title && <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>}
					</div>

					<div>
							<Textarea {...form.register("content")} placeholder="내용을 입력하세요" rows={8} className="resize-none" />
						{form.formState.errors.content && <p className="text-red-500 text-sm mt-1">{form.formState.errors.content.message}</p>}
					</div>

					<div>
							<Input
								placeholder="태그를 입력하세요 (쉼표로 구분)"
								onChange={(e) => {
									const tags = e.target.value
										.split(",")
										.map((tag) => tag.trim())
										.filter(Boolean)
									form.setValue("tags", tags)
								}}
								defaultValue={form.getValues("tags")?.join(", ") || ""}
							/>
						</div>

						<div>
							<CitedRecipeSearch
								selectedRecipes={selectedCitedRecipes}
								onSelectedRecipesChange={(recipes: FeedItem[]) => {
									console.log("🔍 PostForm: CitedRecipeSearch onChange:", recipes)
									setSelectedCitedRecipes(recipes)
									
									// 안전한 string 변환
									const recipeIds = recipes.map((r: FeedItem) => {
										const id = String(r.id || r.item_id || "")
										console.log(`🔍 PostForm: Recipe ${r.title} -> ID: ${id} (type: ${typeof id})`)
										return id
									}).filter(id => id !== "")
									
									console.log("🔍 PostForm: Setting cited_recipe_ids:", recipeIds)
									
									// 타입 검증
									if (Array.isArray(recipeIds) && recipeIds.every(id => typeof id === 'string')) {
										form.setValue("cited_recipe_ids", recipeIds)
									} else {
										console.error("❌ PostForm: Invalid recipeIds type:", recipeIds)
										form.setValue("cited_recipe_ids", [])
									}
								}}
							/>
						</div>
					</div>

					<Button type="submit" disabled={isSubmitting} className="w-full">
						{isSubmitting ? "저장 중..." : isEditMode ? "수정하기" : "게시하기"}
					</Button>
				</form>
			</div>
		</div>
	)
}
