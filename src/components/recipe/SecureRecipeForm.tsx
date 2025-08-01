/**
 * 🛡️ 보안이 강화된 레시피 작성 폼
 * 기존 RecipeForm에 보안 시스템 적용 예시
 */

"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2, Camera, Clock, Book } from "lucide-react"

// 🛡️ 보안 강화 시스템 임포트
import { secureRecipeSchema, type SecureRecipeFormValues } from "@/lib/secure-schemas"
import { validateImageFile, validateMultipleFiles, rateLimiter } from "@/lib/security-utils"
import { withRetry, errorHandlers, safeAsync } from "@/lib/error-handling"

import ImageUploader from "@/components/common/ImageUploader"
import InstructionImageUploader from "@/components/recipe/InstructionImageUploader"
import CitedRecipeSearch from "@/components/recipe/CitedRecipeSearch"
import { useToast } from "@/hooks/use-toast"
import { RECIPE_COLOR_OPTIONS } from "@/lib/color-options"
import type { Item } from "@/types/item"
import { uploadImagesOptimized } from "@/utils/image-optimization"
import { cacheManager } from "@/lib/unified-cache-manager"
import { notificationService } from "@/lib/notification-service"

interface SecureRecipeFormProps {
	initialData?: Item | null
	onNavigateBack?: (itemId?: string, options?: { replace?: boolean }) => void
}

export default function SecureRecipeForm({ initialData, onNavigateBack }: SecureRecipeFormProps) {
	const router = useRouter()
	const { toast } = useToast()
	const supabase = createSupabaseBrowserClient()

	// ================================
	// 1. 상태 관리 (메모리 누수 방지 적용)
	// ================================
	
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [mainImages, setMainImages] = useState<Array<{ file: File; preview: string }>>([])
	const [thumbnailIndex, setThumbnailIndex] = useState(0)
	const [selectedCitedRecipes, setSelectedCitedRecipes] = useState<Item[]>([])

	const isEditMode = !!initialData

	// 🛡️ 폼 설정 (보안 강화 스키마 적용)
	const form = useForm<SecureRecipeFormValues>({
		resolver: zodResolver(secureRecipeSchema),
		defaultValues: {
			title: "",
			description: "",
			servings: 1,
			cooking_time_minutes: 30,
			is_public: true,
			ingredients: [{ name: "", amount: 1, unit: "" }],
			instructions: [{ description: "", image_url: "" }],
			color_label: null,
			tags: [],
			cited_recipe_ids: [],
		},
	})

	// ================================
	// 2. 초기 데이터 로드 (에러 핸들링 적용)
	// ================================

	useEffect(() => {
		if (initialData) {
			// 🛡️ 안전한 데이터 로드
			safeAsync(async () => {
				form.reset({
					title: initialData.title || "",
					description: initialData.description || "",
					servings: initialData.servings || 1,
					cooking_time_minutes: initialData.cooking_time_minutes || 30,
					is_public: initialData.is_public ?? true,
					ingredients: initialData.ingredients || [{ name: "", amount: 1, unit: "" }],
					instructions: initialData.instructions || [{ description: "", image_url: "" }],
					color_label: initialData.color_label || null,
					tags: initialData.tags || [],
					cited_recipe_ids: initialData.cited_recipe_ids || [],
				})

				// 기존 이미지 설정
				if (initialData.image_urls?.length) {
					setMainImages(
						initialData.image_urls.map((url, index) => ({
							file: new File([], `existing-${index}`),
							preview: url,
						}))
					)
					setThumbnailIndex(initialData.thumbnail_index || 0)
				}

				// 참고 레시피 로드
				if (initialData.cited_recipe_ids?.length) {
					await loadCitedRecipes(initialData.cited_recipe_ids)
				}
			}, undefined, (error) => {
				errorHandlers.dataLoad(error, '레시피 정보')
			})
		}
	}, [initialData, form])

	// ================================
	// 3. 안전한 참고레시피 로드
	// ================================

	const loadCitedRecipes = useCallback(async (recipeIds: string[]) => {
		try {
			// 🛡️ UUID 검증
			const validIds = recipeIds.filter(id => 
				/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
			)

			if (validIds.length === 0) return

			const { data: citedRecipes, error } = await supabase
				.from("items")
				.select(`
					id, title, created_at, item_type, image_urls, user_id,
					author:profiles!items_user_id_fkey(display_name, username, public_id, avatar_url)
				`)
				.in("id", validIds)
				.eq("item_type", "recipe")

			if (error) throw error

			if (citedRecipes) {
				const formattedRecipes = citedRecipes.map(item => ({
					item_id: item.id,
					user_id: item.user_id,
					item_type: 'recipe' as const,
					created_at: item.created_at,
					is_public: true,
					display_name: item.author?.display_name || "익명",
					avatar_url: item.author?.avatar_url || null,
					user_public_id: item.author?.public_id || null,
					user_email: null,
					title: item.title,
					content: null,
					description: null,
					image_urls: item.image_urls,
					tags: [],
					color_label: null,
					servings: null,
					cooking_time_minutes: null,
					recipe_id: null,
					likes_count: 0,
					comments_count: 0,
					is_liked: false,
					is_following: false,
					cited_recipe_ids: [],
				}))

				setSelectedCitedRecipes(formattedRecipes as Item[])
			}
		} catch (error) {
			errorHandlers.dataLoad(error, '참고 레시피')
		}
	}, [supabase])

	// ================================
	// 4. 보안 강화된 이미지 핸들러
	// ================================

	const handleMainImagesChange = useCallback((images: Array<{ file: File; preview: string }>) => {
		// 🛡️ 파일 검증
		const files = images.map(img => img.file).filter(file => file.size > 0)
		
		if (files.length > 0) {
			const validation = validateMultipleFiles(files)
			if (!validation.isValid) {
				errorHandlers.fileUpload(new Error(validation.error))
				return
			}

			// 경고사항 표시
			if (validation.warnings?.length) {
				validation.warnings.forEach(warning => {
					toast({
						title: "주의사항",
						description: warning,
						variant: "default",
					})
				})
			}
		}

		setMainImages(images)
	}, [toast])

	// ================================
	// 5. 레이트 리미팅이 적용된 제출 핸들러
	// ================================

	const onSubmit = useCallback(async (values: SecureRecipeFormValues) => {
		// 🛡️ 레이트 리미팅 체크
		const userId = (await supabase.auth.getUser()).data.user?.id
		if (!userId) {
			errorHandlers.auth(new Error('인증이 필요합니다'))
			return
		}

		const rateLimit = rateLimiter.checkLimit(`recipe_submit_${userId}`, 5, 60000) // 1분에 5번
		if (!rateLimit.allowed) {
			toast({
				title: "요청 제한",
				description: `너무 많은 요청을 보냈습니다. ${Math.ceil((rateLimit.resetTime! - Date.now()) / 1000)}초 후 다시 시도해주세요.`,
				variant: "destructive",
			})
			return
		}

		// 🛡️ 기본 검증
		if (mainImages.length === 0) {
			toast({ 
				title: "이미지 필요", 
				description: "레시피 대표 이미지를 최소 1개 업로드해주세요.", 
				variant: "destructive" 
			})
			return
		}

		setIsSubmitting(true)

		try {
			// 🚀 재시도 로직이 적용된 제출 프로세스
			await withRetry(async () => {
				const { data: { user } } = await supabase.auth.getUser()
				if (!user) {
					throw new Error("Authentication required")
				}

				const bucketId = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS
				if (!bucketId) {
					throw new Error("Storage bucket not configured")
				}

				// 이미지 업로드 (재시도 적용)
				let uploadedImageUrls: string[] = []
				const newImageFiles = mainImages.filter((img) => img.file.size > 0)
				const existingImageUrls = mainImages
					.filter((img) => !newImageFiles.includes(img))
					.map((img) => img.preview)

				if (newImageFiles.length > 0) {
					const uploadResults = await uploadImagesOptimized(
						newImageFiles,
						user.id,
						bucketId,
						(progress) => {
							// 업로드 진행률 표시 가능
						}
					)

					uploadedImageUrls = uploadResults.map(result => {
						if (!result.success) {
							throw new Error(result.error || '이미지 업로드 실패')
						}
						return result.url
					})
				}

				const finalImageUrls = [...existingImageUrls, ...uploadedImageUrls]

				// 조리법 이미지 업로드
				const instructionsWithImages = await Promise.all(
					values.instructions.map(async (instruction, index) => {
						// 이미지 업로드 로직...
						return {
							...instruction,
							step_number: index + 1
						}
					})
				)

				// 데이터베이스 저장
				const itemPayload = {
					user_id: user.id,
					item_type: "recipe" as const,
					title: values.title,
					description: values.description,
					image_urls: finalImageUrls,
					tags: values.tags,
					servings: values.servings,
					cooking_time_minutes: values.cooking_time_minutes,
					color_label: values.color_label,
					is_public: values.is_public,
					cited_recipe_ids: values.cited_recipe_ids,
					ingredients: values.ingredients,
					instructions: instructionsWithImages,
					thumbnail_index: thumbnailIndex,
				}

				let itemId: string

				if (isEditMode && initialData) {
					const { data: updatedItem, error: itemError } = await supabase
						.from("items")
						.update(itemPayload)
						.eq("id", initialData.id)
						.select("*")
						.single()

					if (itemError) throw new Error(`레시피 수정 실패: ${itemError.message}`)
					itemId = updatedItem.id
				} else {
					const { data: newItem, error: itemError } = await supabase
						.from("items")
						.insert(itemPayload)
						.select("*")
						.single()

					if (itemError) throw new Error(`레시피 생성 실패: ${itemError.message}`)
					itemId = newItem.id
				}

				// 캐시 동기화
				const fullItemPayload = {
					...itemPayload,
					id: itemId,
					item_id: itemId,
					display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous',
					username: user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
					avatar_url: user.user_metadata?.avatar_url || null,
					user_public_id: user.user_metadata?.public_id || null,
					likes_count: 0,
					comments_count: 0,
					is_liked: false,
					is_following: false,
					created_at: new Date().toISOString(),
				}

				if (isEditMode) {
					await cacheManager.updateItem(itemId, fullItemPayload)
				} else {
					await cacheManager.addNewItem(fullItemPayload as Item)
				}

				toast({ 
					title: `레시피 ${isEditMode ? "수정" : "작성"} 완료`, 
					description: `성공적으로 ${isEditMode ? "수정" : "등록"}되었습니다.` 
				})

				// 🔔 참고레시피 알림 발송 (안전한 처리)
				if (values.cited_recipe_ids && values.cited_recipe_ids.length > 0) {
					safeAsync(async () => {
						if (!isEditMode) {
							await notificationService.notifyRecipeCited(
								itemId, 
								values.cited_recipe_ids!, 
								user.id, 
								values.is_public
							)
						} else if (initialData) {
							const wasPrivate = !initialData.is_public
							const nowPublic = values.is_public
							if (wasPrivate && nowPublic) {
								await notificationService.notifyRecipeCited(
									itemId, 
									values.cited_recipe_ids!, 
									user.id, 
									true
								)
							}
						}
					}, undefined, (error) => {
						console.error('❌ 참고레시피 알림 발송 실패:', error)
						// 알림 실패는 사용자에게 알리지 않음 (중요하지 않은 기능)
					})
				}

				// 네비게이션
				if (onNavigateBack) {
					onNavigateBack(itemId, { replace: isEditMode })
				} else {
					router.push("/")
				}
			}, {
				maxAttempts: 3,
				baseDelay: 1000,
				retryCondition: (error) => error.retryable === true
			})

		} catch (error: any) {
			errorHandlers.form(error, '레시피')
		} finally {
			setIsSubmitting(false)
		}
	}, [mainImages, thumbnailIndex, supabase, toast, isEditMode, initialData, onNavigateBack, router])

	// ================================
	// 6. 메모리 누수 방지
	// ================================

	useEffect(() => {
		// cleanup URL objects when component unmounts
		return () => {
			mainImages.forEach(img => {
				if (img.preview.startsWith('blob:')) {
					URL.revokeObjectURL(img.preview)
				}
			})
		}
	}, [mainImages])

	// ================================
	// 7. 렌더링 (기존과 동일하지만 보안 강화)
	// ================================

	return (
		<div className="min-h-screen bg-gray-50 pb-20">
			<div className="container mx-auto max-w-4xl py-8 px-4">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Camera className="w-6 h-6 text-orange-500" />
							{isEditMode ? "레시피 수정" : "새 레시피 작성"}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
							{/* 기본 정보 */}
							<div className="space-y-4">
								<div>
									<Label htmlFor="title" className="text-base font-medium">
										제목 *
									</Label>
									<Input
										id="title"
										{...form.register("title")}
										placeholder="레시피 제목을 입력하세요"
										className="mt-1"
									/>
									{form.formState.errors.title && (
										<p className="text-red-500 text-sm mt-1">
											{form.formState.errors.title.message}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="description" className="text-base font-medium">
										설명
									</Label>
									<Textarea
										id="description"
										{...form.register("description")}
										placeholder="레시피에 대한 간단한 설명을 적어주세요"
										className="mt-1"
										rows={3}
									/>
									{form.formState.errors.description && (
										<p className="text-red-500 text-sm mt-1">
											{form.formState.errors.description.message}
										</p>
									)}
								</div>
							</div>

							{/* 이미지 업로드 */}
							<div>
								<Label className="text-base font-medium">대표 이미지 *</Label>
								<ImageUploader
									images={mainImages}
									onImagesChange={handleMainImagesChange}
									maxImages={5}
									thumbnailIndex={thumbnailIndex}
									onThumbnailChange={setThumbnailIndex}
									showThumbnailSelector={true}
									isEditMode={isEditMode}
								/>
							</div>

							{/* 참고 레시피 (보안 강화 적용) */}
							<div className="space-y-2">
								<Label className="text-base font-medium flex items-center gap-2">
									<Book className="w-4 h-4 text-orange-500" />
									참고 레시피
									<span className="text-sm font-normal text-gray-500">(선택사항)</span>
								</Label>
								<CitedRecipeSearch 
									selectedRecipes={selectedCitedRecipes} 
									onSelectedRecipesChange={(recipes) => {
										setSelectedCitedRecipes(recipes)
										form.setValue("cited_recipe_ids", recipes.map(r => r.item_id))
									}} 
								/>
							</div>

							{/* 제출 버튼 */}
							<div className="flex gap-4 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => onNavigateBack ? onNavigateBack() : router.back()}
									className="flex-1"
								>
									취소
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting}
									className="flex-1 bg-orange-500 hover:bg-orange-600"
								>
									{isSubmitting ? "처리 중..." : isEditMode ? "수정 완료" : "작성 완료"}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}