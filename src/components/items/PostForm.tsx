"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "@/lib/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import ImageUploader from "@/components/common/ImageUploader"
import { OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"
import type { Item } from "@/types/item"
import CitedRecipeSearch from "@/components/recipe/CitedRecipeSearch"

import { uploadImagesOptimized } from "@/lib/image-optimization"
import { cacheManager } from "@/lib/unified-cache-manager"
import { notificationService } from "@/lib/notification-service"
import { logEvent } from "@/lib/events"
import { mutate as globalMutate } from "swr"
import { PageHeader, SectionHeading, Sheet, SourceRow } from "@/components/kit"
import { revalidateItemPage } from "@/lib/revalidate-item"
import { removeDroppedImages } from "@/lib/item-images"

interface PostFormProps {
	isEditMode?: boolean
	initialData?: Item
	onNavigateBack?: (itemId?: string, options?: { replace?: boolean }) => void // 스마트 네비게이션 콜백
	// 레시피 화면이나 요리 모드에서 "만들었어요"로 들어온 경우: 출처 레시피와 작성 경로
	sourceRecipeId?: string | null
	sourceOrigin?: "recipe_detail" | "cook_mode" | null
}

const postSchema = z.object({
	// 레시피드는 사진과 글이 주인공이라 제목은 선택이다 (DESIGN.md Interface Grammar 1)
	title: z.string().optional(),
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
export default function PostForm({ isEditMode = false, initialData, onNavigateBack, sourceRecipeId = null, sourceOrigin = null }: PostFormProps) {
	const router = useRouter()
	const { toast } = useToast()
	const supabase = createSupabaseBrowserClient()

	const [isSubmitting, setIsSubmitting] = useState(false)
	// 수정할 때의 처음 값: 이미 올린 사진과 대표 사진 (수정 화면은 initialData가 준비된 뒤에만 이 폼을 그린다)
	const editing = isEditMode && initialData ? initialData : null
	const [mainImages, setMainImages] = useState<OptimizedImage[]>(() =>
		(editing?.image_urls ?? []).map((url): OptimizedImage => ({ file: new File([], url.split("/").pop()!), preview: url, width: 800, height: 600 }))
	)
	const [thumbnailIndex, setThumbnailIndex] = useState(() => Math.max(0, Math.min(editing?.thumbnail_index ?? 0, (editing?.image_urls?.length ?? 1) - 1)))
	
	// 대표 사진을 바꾸면 수정 중인 글의 화면 캐시도 바로 바꾼다
	const editItemId = editing?.id
	const handleThumbnailChange = useCallback((newIndex: number) => {
		setThumbnailIndex(newIndex)
		if (!editItemId) return
		cacheManager.updateItem(editItemId, { thumbnail_index: newIndex, id: editItemId, item_id: editItemId }).catch((error) => {
			console.error("❌ PostForm: Failed to update thumbnail cache:", error)
		})
	}, [editItemId])
	const [selectedCitedRecipes, setSelectedCitedRecipes] = useState<Item[]>([])

	const form = useForm<PostFormValues>({
		resolver: zodResolver(postSchema),
		mode: "onChange",
		defaultValues: {
			title: editing?.title || "",
			content: editing?.content || "",
			is_public: editing?.is_public ?? true, // 레시피드 기본값은 공개
			tags: editing?.tags || [],
			cited_recipe_ids: Array.isArray(editing?.cited_recipe_ids) ? editing.cited_recipe_ids.map(String).filter(Boolean) : [],
		},
	})

	// 참고 레시피의 표시 정보(제목, 작성자) 조회
	const loadCitedRecipes = useCallback(
		async (ids: string[]): Promise<Item[]> => {
			const { data, error } = await supabase
				.from("items")
				.select("id, title, item_type, image_urls, user_id, created_at, author:profiles!items_user_id_fkey(display_name, username, public_id, avatar_url)")
				.in("id", ids)
				.eq("item_type", "recipe")
			if (error) {
				console.error("Error fetching cited recipes", error)
				return []
			}
			return data.map((recipe) => {
				const authorProfile = Array.isArray(recipe.author) ? recipe.author[0] : recipe.author
				return {
					...recipe,
					item_id: recipe.id,
					display_name: authorProfile?.username,
					username: authorProfile?.username,
					avatar_url: authorProfile?.avatar_url,
					user_public_id: authorProfile?.public_id,
				}
			}) as unknown as Item[]
		},
		[supabase]
	)

	// "이 레시피로 만들었어요"로 들어오면 출처 레시피를 미리 연결한다 (다시 검색할 필요 없음)
	useEffect(() => {
		if (isEditMode || !sourceRecipeId) return
		loadCitedRecipes([sourceRecipeId]).then((recipes) => {
			if (recipes.length === 0) return
			setSelectedCitedRecipes(recipes)
			form.setValue("cited_recipe_ids", [sourceRecipeId])
		})
	}, [isEditMode, sourceRecipeId, loadCitedRecipes, form])

	// 수정할 때 이미 연결된 참고 레시피의 제목·작성자를 받는다
	const editCitedKey = editing?.cited_recipe_ids?.join(",") ?? ""
	useEffect(() => {
		if (!editCitedKey) return
		loadCitedRecipes(editCitedKey.split(",")).then(setSelectedCitedRecipes)
	}, [editCitedKey, loadCitedRecipes])

	// 폼 에러 핸들러 추가
	const onError = () => {
	
		
		toast({
			title: "입력 오류",
			description: "필수 항목을 모두 입력해주세요.",
			variant: "destructive"
		})
	}

	const onSubmit = async (values: PostFormValues) => {
	
		
		setIsSubmitting(true)
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser()

			if (!user) {
				throw new Error("로그인이 필요합니다.")
			}



					const bucketId = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS
			
			
			
			if (!bucketId) {
				throw new Error("Storage bucket ID가 설정되지 않았습니다.")
			}

		// 업계 표준: 원본 순서 유지 + 썸네일 인덱스 정보 저장 (개선된 Instagram/Facebook 방식)
		

		// 최적화된 병렬 이미지 업로드 (기존: 순차 → 새로운: 병렬 + 캐싱)
		let uploadedImageUrls: string[] = []

		if (isEditMode && initialData) {
			// 수정 모드: 기존 이미지와 새 이미지 구분 처리 (원본 순서 유지)
			const newImageFiles = mainImages.filter((img) => img.file.size > 0)
			const existingImageUrls = mainImages.filter((img) => !newImageFiles.includes(img)).map((img) => img.preview)
			
			if (newImageFiles.length > 0) {

				const uploadResults = await uploadImagesOptimized(
					newImageFiles, 
					user.id, 
					bucketId,

				)

				// 업로드 결과 검증 및 URL 추출
				const newUploadedUrls = uploadResults.map(result => {
					if (!result.success) {
						throw new Error(result.error || '이미지 업로드에 실패했습니다.')
					}
					return result.url
				})
				
				// 기존 이미지와 새 업로드 이미지 병합 (이미 썸네일 순서로 정렬됨)
				uploadedImageUrls = [...existingImageUrls, ...newUploadedUrls]
			} else {
				// 새로 업로드할 이미지가 없는 경우 - 기존 이미지만 재정렬
				uploadedImageUrls = existingImageUrls
			}
		} else {
			// 생성 모드: 모든 이미지를 새로 업로드 (원본 순서 유지)
			const imagesToUpload = mainImages.filter(img => img.file.size > 0)
			
			if (imagesToUpload.length > 0) {

				const uploadResults = await uploadImagesOptimized(
					imagesToUpload, 
					user.id, 
					bucketId,

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






			const itemPayload = {
				user_id: user.id,
				item_type: "post" as const,
				title: values.title?.trim() || null,
				content: values.content,
				image_urls: uploadedImageUrls,
				tags: values.tags,
				cited_recipe_ids: values.cited_recipe_ids,
				is_public: values.is_public, // 사용자가 설정한 공개/비공개 값
				thumbnail_index: thumbnailIndex, // 썸네일 인덱스 저장
				// 작성 경로: 출처 레시피가 그대로 연결돼 있으면 그 경로, 직접 고른 인용이면 manual (관계 종류를 정한다)
				...(isEditMode
					? {}
					: {
							creation_origin:
								sourceRecipeId && sourceOrigin && values.cited_recipe_ids?.includes(sourceRecipeId)
									? sourceOrigin
									: values.cited_recipe_ids && values.cited_recipe_ids.length > 0
										? ("manual" as const)
										: null,
						}),
			}
			
			// SSA 기반: 간단하고 안정적인 제출 프로세스

			let itemId: string

			if (isEditMode && initialData) {
				const { data: updatedItem, error: itemError } = await supabase.from("items").update(itemPayload).eq("id", initialData.id).select("*").single()

				if (itemError) throw new Error(`레시피드 수정 실패: ${itemError.message}`)
				itemId = updatedItem.id
				

			} else {
				const { data: newItem, error: itemError } = await supabase.from("items").insert(itemPayload).select("*").single()

				if (itemError) throw new Error(`레시피드 생성 실패: ${itemError.message}`)
				itemId = newItem.id
				

			}

			// SSA 기반: 통합 캐시 매니저를 통한 완전 자동 동기화

			
			const fullItemPayload = {
				...itemPayload,
				id: itemId,
				item_id: itemId,
				// 사용자 정보 추가 (optimized_feed_view 호환)
				        display_name: user.email?.split('@')[0] || 'Anonymous',
				username: user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
				avatar_url: user.user_metadata?.avatar_url || null,
				user_public_id: user.user_metadata?.public_id || null,
				// 초기 통계 값
				likes_count: initialData?.likes_count || 0,
				comments_count: initialData?.comments_count || 0,
				is_liked: initialData?.is_liked || false,
				is_following: initialData?.is_following || false,
				created_at: initialData?.created_at || new Date().toISOString(),
			}
			
			if (isEditMode) {
				// SSA: 아이템 업데이트 - 모든 캐시 자동 동기화

				await cacheManager.updateItem(itemId, fullItemPayload)
				
				// Smart Fallback: 필요시에만 부분 무효화 (성능 개선)
				setTimeout(async () => {

					await cacheManager.revalidateHomeFeed()
				}, 200)
				

			} else {
				// SSA: 새로운 아이템 추가 - 홈피드 맨 위에 즉시 표시!
				await cacheManager.addNewItem(fullItemPayload as Item)
			}
			

			

			
			// DataManager가 모든 캐시 동기화를 처리하므로 추가 작업 불필요


			
					toast({
			title: `레시피드 ${isEditMode ? "수정" : "작성"} 완료!`,
			description: "레시피드가 성공적으로 처리되었습니다.",
		})
			
			if (!isEditMode) logEvent("recipeed_create", itemId, sourceOrigin ?? undefined)
			revalidateItemPage(itemId) // 미리 만든 상세 페이지를 고친 내용으로 바로 갱신
			// 고치면서 빠진 사진 파일을 저장소에서 지운다
			if (isEditMode && initialData) removeDroppedImages(initialData.image_urls || [], uploadedImageUrls)
			// 레시피 상세의 "만들어 본 기록"이 바로 보이도록 관계 캐시를 비운다
			values.cited_recipe_ids?.forEach((id) => globalMutate(`recipe-relations:${id}`))

			// 참고레시피 알림 발송
			if (values.cited_recipe_ids && values.cited_recipe_ids.length > 0) {
				if (!isEditMode) {
					// 새로 작성하는 경우: 공개 설정 시에만 알림 발송
					notificationService.notifyRecipeCited(itemId, values.cited_recipe_ids, user.id, values.is_public)
						.catch(error => console.error('❌ 참고레시피 알림 발송 실패:', error))
				} else if (initialData) {
					// 수정하는 경우: 비공개→공개 전환 시에만 알림 발송
					const wasPrivate = !initialData.is_public
					const nowPublic = values.is_public
					if (wasPrivate && nowPublic) {
						notificationService.notifyRecipeCited(itemId, values.cited_recipe_ids, user.id, true)
							.catch(error => console.error('❌ 참고레시피 알림 발송 실패:', error))
					}
				}
			}
			
			// 레시피에서 나온 기록은 그 레시피로 돌아가 "만들어 본 기록"에 붙은 것을 보여 준다
			if (!isEditMode && sourceRecipeId && values.cited_recipe_ids?.includes(sourceRecipeId)) {
				router.replace(`/recipes/${sourceRecipeId}#made-heading`)
				return
			}

			// 스마트 네비게이션: 사용자가 온 곳으로 적절히 돌아가기
			if (onNavigateBack) {
				// 업계 표준: 수정 완료 후 History Replace로 수정폼 제거
				onNavigateBack(itemId, { replace: isEditMode })
			} else {
				// 폴백: 홈화면으로 이동 (새로운 아이템이 이미 캐시에 추가됨)
				router.push("/")
			}
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

	const errors = form.formState.errors
	const sourceRecipes = !isEditMode && sourceRecipeId ? selectedCitedRecipes.filter((r) => r.id === sourceRecipeId) : []
	const fieldLabel = "text-sm font-medium text-ink"
	const errorText = "mt-1 text-sm text-destructive"
	const handleCitedChange = (recipes: Item[]) => {
		setSelectedCitedRecipes(recipes)
		const recipeIds = recipes.map((r: Item) => String(r.id || r.item_id || "")).filter((id) => id !== "")
		form.setValue("cited_recipe_ids", recipeIds)
	}

	// 출처를 기억과 양심에 맡기지 않는다: 레시피 화면에서 오지 않았다면 먼저 어떤 레시피로 만들었는지 묻는다
	const citedSection = (
		<section aria-labelledby="post-cited" className={sourceRecipeId ? "border-t border-border px-4 pb-5 pt-5" : "border-b border-border px-4 pb-4 pt-4"}>
			<SectionHeading id="post-cited">
				{sourceRecipeId ? "함께 참고한 레시피" : "어떤 레시피로 만들었나요?"} <span className="text-sm font-normal text-ink-soft">(선택)</span>
			</SectionHeading>
			{!sourceRecipeId && <p className="mt-1 text-[13px] text-ink-soft">고르면 그 레시피 화면의 만들어 본 기록에 이어져요.</p>}
			<div className="mt-2">
				<CitedRecipeSearch selectedRecipes={selectedCitedRecipes} onSelectedRecipesChange={handleCitedChange} />
			</div>
		</section>
	)

	// 레시피드는 출처가 맨 위 첫 줄, 그다음 사진과 글 (DESIGN.md Interface Grammar 1)
	return (
		<div className="min-h-screen pb-28">
			<PageHeader leading="cancel" title={isEditMode ? "레시피드 수정" : sourceRecipeId ? "만들어 본 기록" : "레시피드 쓰기"} />

			<form id="post-form" onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-3 px-3 pt-3">
				<Sheet>
					{sourceRecipes.length > 0 && (
						<SourceRow recipes={sourceRecipes} creationOrigin={sourceOrigin} asLink={false} className="border-t-0" />
					)}
					{!sourceRecipeId && citedSection}

					<section className="space-y-5 px-4 pb-5 pt-5">
						<ImageUploader
							images={mainImages}
							onImagesChange={setMainImages}
							maxImages={5}
							label="사진"
							placeholder={sourceRecipeId ? "만든 요리 사진을 올려 주세요" : "사진을 올려 주세요"}
							frame="recipeed"
							thumbnailIndex={thumbnailIndex}
							onThumbnailChange={handleThumbnailChange}
							showThumbnailSelector={true}
						/>

						<div>
							<Label htmlFor="post-content" className={fieldLabel}>
								글
							</Label>
							<Textarea
								id="post-content"
								{...form.register("content")}
								placeholder={sourceRecipeId ? "어떻게 만들었는지, 바꾼 점이나 맛은 어땠는지" : "요리 이야기를 들려 주세요"}
								rows={6}
								className="mt-1.5 resize-none text-[16px] leading-relaxed"
							/>
							{errors.content && <p className={errorText}>{errors.content.message}</p>}
						</div>

						<div>
							<Label htmlFor="post-title" className={fieldLabel}>
								제목 <span className="font-normal text-ink-soft">(선택)</span>
							</Label>
							<Input id="post-title" {...form.register("title")} placeholder="한 줄로 붙일 이름" className="mt-1.5" />
						</div>

						<div>
							<Label htmlFor="post-tags" className={fieldLabel}>
								태그 <span className="font-normal text-ink-soft">(쉼표로 구분)</span>
							</Label>
							<Input
								id="post-tags"
								placeholder="예: 집밥, 주말요리"
								className="mt-1.5"
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
					</section>

					{sourceRecipeId && citedSection}

					<Controller
						control={form.control}
						name="is_public"
						render={({ field }) => (
							<fieldset className="border-t border-border px-4 pb-4 pt-5">
								<legend className="sr-only">공개 범위</legend>
								<SectionHeading aria-hidden>
									공개 범위
								</SectionHeading>
								<RadioGroup value={field.value.toString()} onValueChange={(value) => field.onChange(value === "true")} className="mt-1">
									<label htmlFor="post-public" className="flex min-h-12 items-center gap-3">
										<RadioGroupItem value="true" id="post-public" />
										<span className="text-[15px] text-ink">
											공개 <span className="text-ink-soft">· 누구나 볼 수 있어요</span>
										</span>
									</label>
									<label htmlFor="post-private" className="flex min-h-12 items-center gap-3">
										<RadioGroupItem value="false" id="post-private" />
										<span className="text-[15px] text-ink">
											비공개 <span className="text-ink-soft">· 나만 봐요</span>
										</span>
									</label>
								</RadioGroup>
							</fieldset>
						)}
					/>
				</Sheet>
			</form>

			<div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-border bg-paper px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
				<Button type="submit" form="post-form" disabled={isSubmitting} className="h-12 w-full text-base">
					{isSubmitting ? "저장하는 중..." : isEditMode ? "고친 내용 저장" : sourceRecipeId ? "기록 남기기" : "레시피드 올리기"}
				</Button>
			</div>
		</div>
	)
}
