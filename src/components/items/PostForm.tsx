"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera } from "lucide-react"
import ImageUploader from "@/components/common/ImageUploader"
import { OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"
import type { Item } from "@/types/item"
import CitedRecipeSearch from "@/components/recipe/CitedRecipeSearch"

import { useSWRConfig } from "swr"
import { uploadImagesOptimized, processExistingImages, ImageUploadMetrics } from "@/utils/image-optimization"
import { cacheManager } from "@/lib/unified-cache-manager"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"

interface PostFormProps {
	isEditMode?: boolean
	initialData?: Item
}

const postSchema = z.object({
	title: z.string().min(1, "제목을 입력해주세요"),
	content: z.string().min(1, "내용을 입력해주세요"),
	is_public: z.boolean(),
	tags: z.array(z.string()).optional(),
	cited_recipe_ids: z.array(z.string().min(1, "참고 레시피 ID는 비어있을 수 없습니다")).optional(),
})

type PostFormValues = z.infer<typeof postSchema>

/**
 * 레시피드(일반 피드) 생성/수정 폼 컴포넌트
 * 레시피드는 일반적인 피드 게시물로, 참고 레시피를 포함할 수 있습니다
 * 
 * @param isEditMode - 수정 모드 여부 (true: 수정, false: 생성)
 * @param initialData - 수정 시 초기 데이터 (FeedItem 타입)
 */
export default function PostForm({ isEditMode = false, initialData }: PostFormProps) {
	const router = useRouter()
	const { toast } = useToast()
	const supabase = createSupabaseBrowserClient()

	const { mutate } = useSWRConfig()

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [mainImages, setMainImages] = useState<OptimizedImage[]>([])
	const [thumbnailIndex, setThumbnailIndex] = useState(0)
	
	// 🚀 SSA: 섬네일 변경 시 즉시 캐시 업데이트를 위한 wrapper 함수
	const handleThumbnailChange = useCallback(async (newIndex: number) => {
		console.log(`🎯 PostForm: Thumbnail changing ${thumbnailIndex} → ${newIndex}`)
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
					
					console.log(`🚀 PostForm: Updating thumbnail_index in cache immediately`)
					await cacheManager.updateItem(initialData.id, partialUpdate)
					console.log(`✅ PostForm: Thumbnail cache updated successfully`)
					
					// 캐시 업데이트 후 상태 재확인
					setTimeout(() => {
						console.log(`🔍 PostForm: After cache update - thumbnailIndex: ${thumbnailIndex}, newIndex: ${newIndex}`)
					}, 100)
				}
			} catch (error) {
				console.error(`❌ PostForm: Failed to update thumbnail cache:`, error)
				// 캐시 업데이트 실패해도 UI 상태는 유지
			}
		}
	}, [thumbnailIndex, isEditMode, initialData?.id])
	const [selectedCitedRecipes, setSelectedCitedRecipes] = useState<Item[]>([])

	const form = useForm<PostFormValues>({
		resolver: zodResolver(postSchema),
		mode: "onChange",
		defaultValues: {
			title: "",
			content: "",
			is_public: true, // 레시피드 기본값은 공개
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
				is_public: initialData.is_public ?? true, // 기본값은 공개
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
				// 🚀 업계 표준: 저장된 썸네일 인덱스 복원 또는 기본값(0) 사용
				const savedThumbnailIndex = (initialData as any).thumbnail_index ?? 0
				setThumbnailIndex(Math.min(savedThumbnailIndex, fetchedImages.length - 1))
				console.log(`📌 Restored thumbnail index: ${savedThumbnailIndex} (available: ${fetchedImages.length})`)
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
						setSelectedCitedRecipes(formattedRecipes as unknown as Item[])
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

		// 🚀 업계 표준: 원본 순서 유지 + 썸네일 인덱스 정보 저장 (개선된 Instagram/Facebook 방식)
		console.log(`📌 Preserving original image order with thumbnail index: ${thumbnailIndex}`)
		console.log(`📦 Images:`, mainImages.map((img, i) => `${i}: ${img.preview.split('/').pop()}`))

		// 🚀 최적화된 병렬 이미지 업로드 (기존: 순차 → 새로운: 병렬 + 캐싱)
		const uploadStartTime = Date.now()
		let uploadedImageUrls: string[] = []

		if (isEditMode && initialData) {
			// 수정 모드: 기존 이미지와 새 이미지 구분 처리 (원본 순서 유지)
			const newImageFiles = mainImages.filter((img) => img.file.size > 0)
			const existingImageUrls = mainImages.filter((img) => !newImageFiles.includes(img)).map((img) => img.preview)
			
			if (newImageFiles.length > 0) {
				console.log(`📤 Uploading ${newImageFiles.length} new images in parallel...`)
				const uploadResults = await uploadImagesOptimized(
					newImageFiles, 
					user.id, 
					bucketId,
					(progress) => {
						console.log(`📊 Upload progress: ${progress.uploaded}/${progress.total} (${progress.currentFile || ''})`)
					}
				)

				// 업로드 결과 검증 및 URL 추출
				const newUploadedUrls = uploadResults.map(result => {
					if (!result.success) {
						throw new Error(result.error || '이미지 업로드에 실패했습니다.')
					}
					return result.url
				})
				
				// 🚀 기존 이미지와 새 업로드 이미지 병합 (이미 썸네일 순서로 정렬됨)
				uploadedImageUrls = [...existingImageUrls, ...newUploadedUrls]
			} else {
				// 새로 업로드할 이미지가 없는 경우 - 기존 이미지만 재정렬
				uploadedImageUrls = existingImageUrls
			}
		} else {
			// 생성 모드: 모든 이미지를 새로 업로드 (원본 순서 유지)
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
				is_public: values.is_public, // 사용자가 설정한 공개/비공개 값
				thumbnail_index: thumbnailIndex, // 🚀 썸네일 인덱스 저장
			}
			
			// 🚀 SSA 기반: 간단하고 안정적인 제출 프로세스

			let itemId: string

			if (isEditMode && initialData) {
				const { data: updatedItem, error: itemError } = await supabase.from("items").update(itemPayload).eq("id", initialData.id).select("*").single()

				if (itemError) throw new Error(`레시피드 수정 실패: ${itemError.message}`)
				itemId = updatedItem.id
				
				console.log(`✅ PostForm: Item updated successfully - ${itemId}`)
			} else {
				const { data: newItem, error: itemError } = await supabase.from("items").insert(itemPayload).select("*").single()

				if (itemError) throw new Error(`레시피드 생성 실패: ${itemError.message}`)
				itemId = newItem.id
				
				console.log(`✅ PostForm: Item created successfully - ${itemId}`)
			}

			// 🚀 SSA 기반: 통합 캐시 매니저를 통한 완전 자동 동기화
			console.log(`🚀 PostForm: SSA ${isEditMode ? 'update' : 'create'} mode - using cacheManager...`)
			
			const fullItemPayload = {
				...itemPayload,
				id: itemId,
				item_id: itemId,
				// 🔧 사용자 정보 추가 (optimized_feed_view 호환)
				display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
				username: user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
				avatar_url: user.user_metadata?.avatar_url || null,
				user_public_id: user.user_metadata?.public_id || null,
				// 🔧 초기 통계 값
				likes_count: initialData?.likes_count || 0,
				comments_count: initialData?.comments_count || 0,
				is_liked: initialData?.is_liked || false,
				is_following: initialData?.is_following || false,
				created_at: initialData?.created_at || new Date().toISOString(),
			}
			
			if (isEditMode) {
				// 🚀 SSA: 아이템 업데이트 - 모든 캐시 자동 동기화
				console.log(`🔍 PostForm: Calling updateItem with itemId: "${itemId}" and payload:`, {
					id: fullItemPayload.id,
					item_id: fullItemPayload.item_id,
					title: fullItemPayload.title,
					content: fullItemPayload.content,
					thumbnail_index: fullItemPayload.thumbnail_index,
					image_urls: fullItemPayload.image_urls?.length || 0
				})
				await cacheManager.updateItem(itemId, fullItemPayload)
				
				// 🔧 Smart Fallback: 필요시에만 부분 무효화 (성능 개선)
				setTimeout(async () => {
					console.log(`🔄 PostForm: Smart fallback - revalidating home feed only`)
					await cacheManager.revalidateHomeFeed()
				}, 200)
				
				console.log(`✅ PostForm: SSA update completed - all caches synchronized`)
			} else {
				// 🚀 SSA: 새로운 아이템 추가 - 홈피드 맨 위에 즉시 표시!
				await cacheManager.addNewItem(fullItemPayload as Item)
			}
			
			console.log(`✅ PostForm: ${isEditMode ? "수정" : "작성"} 완료 with SSA architecture`)
			

			
			// DataManager가 모든 캐시 동기화를 처리하므로 추가 작업 불필요

			console.log(`✅ PostForm: Post ${isEditMode ? "updated" : "created"} successfully with optimistic update: ${itemId}`)
			
					toast({
			title: `레시피드 ${isEditMode ? "수정" : "작성"} 완료!`,
			description: "레시피드가 성공적으로 처리되었습니다.",
		})
			
			// 홈화면으로 이동 (새로운 아이템이 이미 캐시에 추가됨)
			router.push("/")
		} catch (error) {
			console.error("Post submission error:", error)
			toast({
				title: `레시피드 ${isEditMode ? "수정" : "작성"} 실패`,
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
					<Button type="button" variant="ghost" onClick={() => router.back()}>
						취소
					</Button>
					<h1 className="text-lg font-semibold">{isEditMode ? "레시피드 수정" : "새 레시피드"}</h1>
					<div className="w-12" />
				</div>
			</div>

			<div className="max-w-md mx-auto p-4 space-y-6">
				<form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Camera className="w-5 h-5 text-orange-500" />
								레시피드 이미지
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ImageUploader 
								images={mainImages} 
								onImagesChange={setMainImages} 
								maxImages={5} 
								placeholder="사진을 추가해주세요"
								thumbnailIndex={thumbnailIndex}
								onThumbnailChange={handleThumbnailChange}
								showThumbnailSelector={true}
								isEditMode={isEditMode}
							/>
						</CardContent>
					</Card>

					<div className="space-y-4">
					<div>
							<Input {...form.register("title")} placeholder="제목을 입력하세요" className="text-lg font-semibold bg-white" />
						{form.formState.errors.title && <p className="text-red-500 text-sm mt-1">{form.formState.errors.title.message}</p>}
					</div>

					<div>
							<Textarea {...form.register("content")} placeholder="내용을 입력하세요" rows={8} className="resize-none bg-white" />
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
								onSelectedRecipesChange={(recipes: Item[]) => {
									console.log("🔍 PostForm: CitedRecipeSearch onChange:", recipes)
									setSelectedCitedRecipes(recipes)
									
									// 안전한 string 변환
									const recipeIds = recipes.map((r: Item) => {
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
												<RadioGroupItem value="true" id="post-public" />
												<Label htmlFor="post-public" className="flex-1">
													<div className="font-medium">공개</div>
													<div className="text-sm text-gray-500">모든 사용자가 볼 수 있습니다</div>
												</Label>
											</div>
											<div className="flex items-center space-x-3">
												<RadioGroupItem value="false" id="post-private" />
												<Label htmlFor="post-private" className="flex-1">
													<div className="font-medium">비공개</div>
													<div className="text-sm text-gray-500">나만 볼 수 있습니다</div>
												</Label>
											</div>
										</RadioGroup>
									)}
								/>
							</CardContent>
						</Card>
					</div>

					<Button type="submit" disabled={isSubmitting} className="w-full">
						{isSubmitting ? "저장 중..." : isEditMode ? "수정하기" : "게시하기"}
					</Button>
				</form>
			</div>
		</div>
	)
}
