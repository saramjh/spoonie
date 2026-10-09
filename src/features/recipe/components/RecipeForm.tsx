"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "@/shared/lib/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { Minus, Plus } from "lucide-react"
import ImageUploader from "@/components/common/ImageUploader"
import InstructionImageUploader from "@/features/recipe/components/InstructionImageUploader"
import CitedRecipeSearch from "@/features/recipe/components/CitedRecipeSearch"
import DraggableIngredientList, { DraggableIngredient } from "@/features/recipe/components/DraggableIngredientList"
import { OptimizedImage, optimizeImages } from "@/shared/infra/image-utils"
import { useToast } from "@/hooks/use-toast"
import { useComposerDraft } from "@/hooks/useComposerDraft"


import type { Item } from "@/types/item"
import { uploadImagesOptimized } from "@/shared/infra/image-optimization"
import { cacheManager } from "@/shared/infra/unified-cache-manager"
import { notificationService } from "@/features/notification/data/notification-service"
import { logEvent } from "@/shared/infra/events"
import { mutate as globalMutate } from "swr"
import { ColorLabelPicker, PageHeader, PageLoading, SectionHeading, Sheet, SourceRow, StateSheet } from "@/components/kit"
import { revalidateItemPage } from "@/shared/infra/revalidate-item"
import { removeDroppedImages } from "@/shared/infra/item-images"
import { attachInstructionImages, buildRecipeItemPayload, editDefaults, forkDefaults, removeInstructionPhoto, reorderIngredients } from "@/features/recipe/domain/recipe-form"
import { fetchCitedRecipes, saveRecipeRows, uploadInstructionImages } from "@/features/recipe/data/recipe-repository"
import type { RecipeFormProps } from "@/features/recipe/contracts"
import { onboardingRecipeDefaults } from "@/features/onboarding/domain/review"

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

export type RecipeFormValues = z.infer<typeof recipeSchema>

const onboardingFieldLabels: Record<string, string> = {
	title: "제목",
	image: "완성 사진",
	servings: "분량",
	cooking_time: "조리시간",
	ingredients: "재료·분량",
	instructions: "만드는 법",
}

export default function RecipeForm({
  userId,
	initialData,
	onNavigateBack,
	forkFrom = null,
	entrySource = null,
	onboardingDraft = null,
}: RecipeFormProps) {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()

	const isEditMode = !!initialData



	const [isSubmitting, setIsSubmitting] = useState(false)
	const [mainImages, setMainImages] = useState<OptimizedImage[]>([])
	const [thumbnailIndex, setThumbnailIndex] = useState(0)
	
	const handleThumbnailChange = useCallback(async (newIndex: number) => {

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
					
					await cacheManager.updateItem(initialData.id, partialUpdate)
					

				}
			} catch (error) {
				console.error(`❌ RecipeForm: Failed to update thumbnail cache:`, error)
				// 캐시 업데이트 실패해도 UI 상태는 유지
			}
		}
	}, [isEditMode, initialData?.id, supabase.auth])
	const [instructionImages, setInstructionImages] = useState<(OptimizedImage | null)[]>([])
  const sourceImageRestoreGuard = useRef(false)
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
			form.reset(editDefaults(initialData) as unknown as RecipeFormValues)

			if (initialData.image_urls && initialData.image_urls.length > 0) {
				const fetchedImages = initialData.image_urls.map((url) => ({
					file: new File([], url.split("/").pop() || "image"),
					preview: url,
					width: 800, // 기본값 설정
					height: 600, // 기본값 설정
				}))
				setMainImages(fetchedImages)
				// 저장된 대표 이미지가 범위를 벗어나면 첫 이미지로 제한한다.
				const savedThumbnailIndex = initialData.thumbnail_index ?? 0
				setThumbnailIndex(Math.min(savedThumbnailIndex, fetchedImages.length - 1))
				
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
				const loadCitedRecipes = async () => {
					const recipes = await fetchCitedRecipes(supabase, initialData.cited_recipe_ids!)
					if (recipes) setSelectedCitedRecipes(recipes)
				}
				loadCitedRecipes()
			}
		}
	}, [initialData, isEditMode, form, supabase])

	// fork: 사진과 색상 라벨은 가져오지 않는다 (내가 만든 요리의 사진, 내 정리 기준을 쓴다)
	useEffect(() => {
		if (isEditMode || !forkFrom) return
		form.reset(forkDefaults(forkFrom) as unknown as RecipeFormValues)
		setSelectedCitedRecipes([{ ...forkFrom, item_id: forkFrom.id } as Item])
	}, [isEditMode, forkFrom, form])

	useEffect(() => {
		if (isEditMode || !onboardingDraft) return
		form.reset(onboardingRecipeDefaults(onboardingDraft) as unknown as RecipeFormValues)

		if (!onboardingDraft.sourceImageEndpoint) return
		let cancelled = false

		const loadSourceImage = async () => {
			try {
				const response = await fetch(onboardingDraft.sourceImageEndpoint!, {
					credentials: "same-origin",
					cache: "no-store",
				})
				if (!response.ok) return
				const blob = await response.blob()
				const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"
				const file = new File([blob], "onboarding-source." + extension, { type: blob.type })
				const images = await optimizeImages([file])
				if (!cancelled && !sourceImageRestoreGuard.current) setMainImages((current) => current.length ? current : images)
			} catch (error) {
				console.error("Onboarding source image preload failed:", error)
			}
		}

		loadSourceImage()
		return () => {
			cancelled = true
		}
	}, [form, isEditMode, onboardingDraft])

	const { fields: ingredients, append: appendIngredient, remove: removeIngredient } = useFieldArray({ control: form.control, name: "ingredients" })
	const { fields: instructions, append: appendInstruction, remove: removeInstruction } = useFieldArray({ control: form.control, name: "instructions" })

	const handleIngredientsReorder = (newIngredients: DraggableIngredient[]) => {
	
		
		// 현재 form 값들을 가져오기
		const currentValues = form.getValues("ingredients")

		
		// newIngredients 순서에 맞게 currentValues 재정렬 (칸 id로 원래 값을 찾는다)
		const reorderedValues = reorderIngredients(newIngredients, ingredients.map((field) => field.id), currentValues)
		

		
		// form에 재정렬된 값들 설정
		form.setValue("ingredients", reorderedValues, { shouldValidate: true })
		

	}

	const handleInstructionImageChange = (index: number, image: OptimizedImage | null) => {
    setInstructionImages((previous) => {
      const next = [...previous]
      next[index] = image
      return next
    })
    // A deleted server photo must not reappear via the form field fallback.
    if (!image) form.setValue(`instructions.${index}.image_url`, "", { shouldDirty: true })
  }

  const handleRemoveInstruction = (index: number) => {
    removeInstruction(index)
    setInstructionImages((previous) => removeInstructionPhoto(previous, index))
  }

	const handleSelectedCitedRecipesChange = (recipes: Item[]) => {
		setSelectedCitedRecipes(recipes)
		form.setValue(
			"cited_recipe_ids",
			recipes.map((r) => r.item_id) // item_id로 변경
		)
	}

  const draft = useComposerDraft<RecipeFormValues>({
    key: `v1:${userId ?? initialData?.user_id ?? "unknown"}:recipe:${initialData?.id ?? "new"}:${onboardingDraft?.id ?? forkFrom?.id ?? "default"}`,
    subscribe: (changed) => {
      // eslint-disable-next-line react-hooks/incompatible-library
      const subscription = form.watch(() => changed())
      return () => subscription.unsubscribe()
    },
    snapshot: () => ({ values: form.getValues(), mainImages, instructionImages, thumbnailIndex }),
    restore: (state) => {
      sourceImageRestoreGuard.current = true
      form.reset(state.values)
      setMainImages(state.mainImages)
      setInstructionImages(state.instructionImages ?? [])
      setThumbnailIndex(state.thumbnailIndex)
      const ids = state.values.cited_recipe_ids ?? []
      if (ids.length) {
        void fetchCitedRecipes(supabase, ids).then((recipes) => {
          if (recipes) setSelectedCitedRecipes(recipes)
        })
      } else setSelectedCitedRecipes([])
    },
  })
  const scheduleDraft = draft.scheduleSave
  useEffect(() => { scheduleDraft() }, [mainImages, instructionImages, thumbnailIndex, scheduleDraft])

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

		// image_urls 순서와 thumbnail_index는 함께 저장되어야 한다.
		

		const newImageFiles = mainImages.filter((img) => img.file.size > 0)
		const existingImageUrls = mainImages.filter((img) => !newImageFiles.includes(img)).map((img) => img.preview)
		
		let uploadedImageUrls: string[] = []
		if (newImageFiles.length > 0) {
			
			const uploadResults = await uploadImagesOptimized(
				newImageFiles, 
				user.id, 
				bucketId,
				() => {
					// Progress tracking not implemented yet
				}
			)

			// 결과 검증 및 URL 추출
			uploadedImageUrls = uploadResults.map(result => {
				if (!result.success) {
					throw new Error(result.error || '레시피 이미지 업로드에 실패했습니다.')
				}
				return result.url
			})


			
		}
		
					// 원본 순서 유지로 최종 URL 배열 생성
			const finalImageUrls = [...existingImageUrls, ...uploadedImageUrls]

			// Instruction images upload
			const uploadedInstructionImageUrls = await uploadInstructionImages(supabase, bucketId, user.id, instructionImages)

			const instructionsWithImages = attachInstructionImages(values.instructions, uploadedInstructionImageUrls)



			const itemPayload = buildRecipeItemPayload(values, {
				userId: user.id,
				imageUrls: finalImageUrls,
				thumbnailIndex, // 썸네일 인덱스 저장
				isEditMode,
				forkFromId: forkFrom?.id,
				onboardingDraftId: onboardingDraft?.id,
			})

			const { itemId, ingredientsToInsert } = await saveRecipeRows(supabase, {
				existingId: isEditMode && initialData ? initialData.id : null,
				itemPayload,
				ingredients: values.ingredients,
				instructions: instructionsWithImages,
			})

      await draft.finishPublish() // DB 트랜잭션 성공 후에만 임시 원고 제거

			if (isEditMode) {
				
				const fullItemPayload = {
					...itemPayload,
					id: itemId,
					item_id: itemId,
					// 정렬 순서를 보존하려고 order_index도 함께 넘긴다.
					ingredients: ingredientsToInsert.map((item) => {
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { item_id, ...ing } = item
						return ing
					}),
					instructions: instructionsWithImages.map((inst, index) => ({ 
						...inst, 
						step_number: index + 1 
					})),
					// 작성자 정보 (수정 모드에서는 기존 작성자 정보 유지)
					display_name: initialData?.display_name || initialData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
					username: initialData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
					avatar_url: initialData?.avatar_url || user.user_metadata?.avatar_url || null,
					user_public_id: initialData?.user_public_id || user.user_metadata?.public_id || null,
					// author 정보도 함께 설정 (ItemDetail 호환성)
					author: {
						id: initialData?.user_id || user.id, // Profile 타입 호환성: id 필드 추가
						display_name: initialData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
						username: initialData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
						avatar_url: initialData?.avatar_url || user.user_metadata?.avatar_url || null,
						public_id: initialData?.user_public_id || user.user_metadata?.public_id || null,
					},
					// 초기 통계 값 (기존 값 유지)
					likes_count: initialData?.likes_count || 0,
					comments_count: initialData?.comments_count || 0,
					is_liked: initialData?.is_liked || false,
					is_following: initialData?.is_following || false,
					created_at: initialData?.created_at || new Date().toISOString(),
				}
				
				// 중요: 모든 캐시 즉시 갱신 (홈피드, 프로필, 레시피북 등)
				await cacheManager.updateItem(itemId, fullItemPayload)
			
					} else {
				
				const fullItemPayload = {
					...itemPayload,
					id: itemId,
					item_id: itemId,
					// 정렬 순서를 보존하려고 order_index도 함께 넘긴다.
					ingredients: ingredientsToInsert.map((item) => {
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { item_id, ...ing } = item
						return ing
					}),
					instructions: instructionsWithImages.map((inst, index) => ({ 
						...inst, 
						step_number: index + 1 
					})),
					// 작성자 정보 (신규 작성, username을 display_name으로 사용)
					display_name: user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
					username: user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
					avatar_url: user.user_metadata?.avatar_url || null,
					user_public_id: user.user_metadata?.public_id || null,
					// author 정보도 함께 설정 (ItemDetail 호환성)
					author: {
						id: user.id, // Profile 타입 호환성: id 필드 추가
						display_name: user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
						username: user.user_metadata?.username || user.email?.split('@')[0] || 'anonymous',
						avatar_url: user.user_metadata?.avatar_url || null,
						public_id: user.user_metadata?.public_id || null,
					},
					// 초기 통계 값
					likes_count: 0,
					comments_count: 0,
					is_liked: false,
					is_following: false,
					created_at: new Date().toISOString(),
				}
				await cacheManager.addNewItem(fullItemPayload as Item)
			}

		

		toast({ title: `레시피 ${isEditMode ? "수정" : "작성"} 완료`, description: `성공적으로 ${isEditMode ? "수정" : "등록"}되었습니다.` })
		if (!isEditMode) await logEvent("recipe_create", itemId, entrySource ?? (forkFrom ? "fork" : "recipe_form"))
		if (!isEditMode && forkFrom) logEvent("derived_create", itemId, "fork")
		await revalidateItemPage(itemId, initialData?.tags ?? []) // 상세 + sitemap/topic/profile 검색 자산을 즉시 갱신
		// 고치면서 빠진 사진(대표·단계) 파일을 저장소에서 지운다
		if (isEditMode && initialData) {
			removeDroppedImages(
				[...(initialData.image_urls || []), ...(initialData.instructions || []).map((inst) => inst.image_url)],
				[...finalImageUrls, ...instructionsWithImages.map((inst) => inst.image_url)]
			)
		}
		// 원본 레시피 상세의 "이어진 레시피"가 바로 보이도록 관계 캐시를 비운다
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
		
		// 파트너 유입의 첫 Recipe는 저장 결과를 바로 보여 줘, 작성 보상과 다음 공유/관계 행동을 끊지 않는다.
		if (!isEditMode && entrySource) {
			router.replace(`/recipes/${itemId}`)
			return
		}

		// 내 버전은 저장한 새 레시피로 바로 간다 (위쪽에 원본이 "참고한 레시피"로 겹쳐 보인다)
		if (!isEditMode && forkFrom) {
			router.replace(`/recipes/${itemId}`)
			return
		}

		// 수정 폼은 history에 남기지 않고, 작성자는 원래 진입 경로로 돌려보낸다.
		if (onNavigateBack) {
			onNavigateBack(itemId, { replace: isEditMode })
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

	const errors = form.formState.errors
	const selectedColor = form.watch("color_label")
	const fieldLabel = "text-label font-medium text-ink"
	const errorText = "mt-1 text-meta text-destructive"

  if (draft.recovery) return (
    <div className="px-3 pt-3">
      <PageHeader leading="none" title="이전 작성 내용" />
      <StateSheet title="작성하던 내용을 찾았어요" body="이 기기에 저장된 글과 사진을 이어서 사용할 수 있어요."
        action={<>
          <Button type="button" onClick={draft.restorePrevious}>이어서 쓰기</Button>
          <Button type="button" variant="outline" onClick={() => { void draft.startFresh() }}>새로 시작</Button>
        </>} />
    </div>
  )
  if (!draft.ready) return <PageLoading />

	// 쓰는 순서 = 읽는 순서: 사진 → 제목 → 분량·시간 → 설명 → 재료 → 만드는 법 → 참고 → 내 정리 (DESIGN.md Interface Grammar)
	return (
		<div className="min-h-screen pb-28">
			<PageHeader
        onCancel={() => { void draft.leave(() => router.back()) }}
				leading="cancel"
				title={isEditMode ? "레시피 수정" : onboardingDraft ? "Recipe 초안 검수" : forkFrom ? "내 버전으로 고쳐 쓰기" : "레시피 쓰기"}
			/>

      <p role="status" className={`px-4 pt-2 text-meta ${draft.status === "error" ? "text-destructive" : "text-ink-soft"}`}>
        {draft.status === "saved" ? "이 기기에 임시 저장됨" : draft.status === "pending" ? "임시 저장 중…" : draft.status === "error" ? "임시 저장 실패 · 화면을 닫지 마세요" : "입력한 내용은 이 기기에 자동 저장돼요"}
      </p>
			{/* @ts-expect-error - form 핸들러 타입 변환 처리 */}
			<form id="recipe-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-3 pt-3">
				{!isEditMode && onboardingDraft && (
					<Sheet>
						<div className="px-4 py-4">
							<p className="text-label font-medium text-ink">기존 콘텐츠에서 확인된 내용</p>
							<p className="mt-1 text-meta text-ink-soft">
								원본에서 확인되는 값만 먼저 채웠습니다. 비어 있거나 0인 항목은 저장 전에 직접 확인해 주세요.
							</p>
							{onboardingDraft.unresolvedFields.length > 0 && (
								<p className="mt-2 text-meta text-ink-soft">
									확인 필요: {onboardingDraft.unresolvedFields.map((field) => onboardingFieldLabels[field] || field).join(", ")}
								</p>
							)}
							<a
								href={onboardingDraft.sourceUrl}
								target="_blank"
								rel="noreferrer"
								className="mt-3 inline-flex min-h-11 items-center text-label font-medium text-ink underline underline-offset-4"
							>
								원본 확인
							</a>
						</div>
					</Sheet>
				)}

				{/* fork: 무엇을 바탕으로 쓰는지 먼저 보여 준다. 저장하면 원본의 "이어진 레시피"에 고친 버전으로 실린다 */}
				{!isEditMode && forkFrom && (
					<Sheet>
						<SourceRow recipes={selectedCitedRecipes.filter((r) => r.id === forkFrom.id)} asLink={false} className="border-t-0" />
						<p className="px-4 pb-3 pt-2 text-meta text-ink-soft">분량, 재료, 단계를 가져왔어요. 내 방식대로 고치고 내가 만든 사진을 올려 주세요.</p>
					</Sheet>
				)}

				<Sheet>
					<section className="space-y-5 px-4 pb-5 pt-5">
						<ImageUploader
							images={mainImages}
							onImagesChange={setMainImages}
							maxImages={5}
							label="완성 사진"
							placeholder="완성한 요리 사진을 올려 주세요"
							frame="recipe"
							thumbnailIndex={thumbnailIndex}
							onThumbnailChange={handleThumbnailChange}
							showThumbnailSelector={true}
						/>

						<div>
							<Label htmlFor="title" className={fieldLabel}>
								제목
							</Label>
							<Input id="title" placeholder="예: 대파 듬뿍 김치찌개" className="mt-1.5 h-12 text-heading" {...form.register("title")} />
							{errors.title && <p className={errorText}>{errors.title.message}</p>}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label htmlFor="servings" className={fieldLabel}>
									분량
								</Label>
								<div className="mt-1.5 flex h-11 items-center rounded-lg border border-ink/20">
									<button
										type="button"
										aria-label="1인분 줄이기"
										onClick={() => {
											const current = Number(form.getValues("servings")) || 1
											if (current > 1) form.setValue("servings", current - 1, { shouldValidate: true })
										}}
										className="flex h-full w-11 items-center justify-center text-ink"
									>
										<Minus className="h-4 w-4" aria-hidden />
									</button>
									<Input
										id="servings"
										type="number"
										min="1"
										inputMode="numeric"
										className="h-full min-w-0 flex-1 rounded-none border-0 px-0 text-center tabular-nums focus-visible:ring-0"
										{...form.register("servings")}
									/>
									<span className="pr-1 text-meta text-ink-soft">인분</span>
									<button
										type="button"
										aria-label="1인분 늘리기"
										onClick={() => {
											const current = Number(form.getValues("servings")) || 0
											form.setValue("servings", current + 1, { shouldValidate: true })
										}}
										className="flex h-full w-11 items-center justify-center text-ink"
									>
										<Plus className="h-4 w-4" aria-hidden />
									</button>
								</div>
								{errors.servings && <p className={errorText}>{errors.servings.message}</p>}
							</div>
							<div>
								<Label htmlFor="cooking_time_minutes" className={fieldLabel}>
									조리 시간
								</Label>
								<div className="mt-1.5 flex h-11 items-center rounded-lg border border-ink/20 pr-3">
									<Input
										id="cooking_time_minutes"
										type="number"
										min="1"
										inputMode="numeric"
										placeholder="30"
										className="h-full min-w-0 flex-1 border-0 text-right tabular-nums focus-visible:ring-0"
										{...form.register("cooking_time_minutes")}
									/>
									<span className="pl-1 text-meta text-ink-soft">분</span>
								</div>
								{errors.cooking_time_minutes && <p className={errorText}>{errors.cooking_time_minutes.message}</p>}
							</div>
						</div>

						<div>
							<Label htmlFor="description" className={fieldLabel}>
								한 줄 소개 <span className="font-normal text-ink-soft">(선택)</span>
							</Label>
							<Textarea id="description" placeholder="어떤 맛인지, 언제 만들면 좋은지" className="mt-1.5 min-h-[72px]" {...form.register("description")} />
							<p className="mt-1 text-meta text-ink-soft">자사·협찬 제품이 포함된 Recipe라면 제품과의 관계를 프로필이나 이 소개에 분명히 적어주세요.</p>
						</div>
					</section>

					<section aria-labelledby="form-ingredients" className="border-t border-border px-4 pb-5 pt-5">
						<div className="flex items-baseline justify-between">
							<SectionHeading id="form-ingredients" count={ingredients.length}>
								재료</SectionHeading>
							{ingredients.length > 1 && <span className="text-meta text-ink-soft">왼쪽 손잡이로 순서 바꾸기</span>}
						</div>
						<div className="mt-2">
							<DraggableIngredientList
								ingredients={ingredients.map((field, index) => {
									// React Compiler는 켜 두지 않았다(next.config). 이 컴포넌트는 react-hook-form watch 때문에 컴파일 대상에서 빠지는데, 바꾸면 다른 규칙 위반이 드러나 따로 다룬다
									const watchedIngredient = form.watch(`ingredients.${index}`)
									return {
										id: field.id,
										name: watchedIngredient?.name || "",
										amount: watchedIngredient?.amount || 0,
										unit: watchedIngredient?.unit || "",
									}
								})}
								onReorder={handleIngredientsReorder}
								register={form.register}
								errors={errors}
								onRemove={removeIngredient}
							/>
						</div>
						<Button type="button" variant="outline" onClick={() => appendIngredient({ name: "", amount: 1, unit: "" })} className="mt-3 w-full">
							<Plus className="h-4 w-4" aria-hidden />
							재료 추가
						</Button>
						{errors.ingredients?.root && <p className={errorText}>{errors.ingredients.root.message}</p>}
					</section>

					<section aria-labelledby="form-steps" className="border-t border-border px-4 pb-5 pt-5">
						<SectionHeading id="form-steps">
							만드는 법 <span className="font-medium tabular-nums text-ink-soft">{instructions.length}단계</span>
						</SectionHeading>
						<ol className="mt-2">
							{instructions.map((field, index) => (
								<li key={field.id} className="flex gap-3 border-b border-border py-4 last:border-b-0">
									<span className="w-6 flex-shrink-0 pt-2.5 text-heading tabular-nums text-ink">{index + 1}</span>
									<div className="min-w-0 flex-1 space-y-2">
										<Textarea
											placeholder="이 단계에서 할 일을 적어 주세요"
											aria-label={`${index + 1}단계 설명`}
											className="min-h-[88px] text-body"
											{...form.register(`instructions.${index}.description`)}
										/>
										{errors.instructions?.[index]?.description && <p className={errorText}>{errors.instructions[index].description.message}</p>}
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0 flex-1">
												<InstructionImageUploader imageUrl={instructionImages[index]?.preview} onImageChange={(image) => handleInstructionImageChange(index, image)} />
											</div>
											{instructions.length > 1 && (
												<button
													type="button"
													onClick={() => handleRemoveInstruction(index)}
													className="h-11 flex-shrink-0 px-1 text-meta text-ink-soft underline underline-offset-4 hover:text-destructive"
												>
													단계 지우기
												</button>
											)}
										</div>
									</div>
								</li>
							))}
						</ol>
						<Button type="button" variant="outline" onClick={() => appendInstruction({ description: "", image_url: "" })} className="mt-3 w-full">
							<Plus className="h-4 w-4" aria-hidden />
							단계 추가
						</Button>
						{errors.instructions?.root && <p className={errorText}>{errors.instructions.root.message}</p>}
					</section>

					<section aria-labelledby="form-cited" className="border-t border-border px-4 pb-5 pt-5">
						<SectionHeading id="form-cited">
							참고한 레시피 <span className="text-meta font-normal text-ink-soft">(선택)</span>
						</SectionHeading>
						<p className="mt-1 text-meta text-ink-soft">바탕이 된 레시피를 고르면 그 레시피의 &lsquo;이어진 레시피&rsquo;에 실리고 작성자에게 알려져요.</p>
						<div className="mt-2">
							<CitedRecipeSearch selectedRecipes={selectedCitedRecipes} onSelectedRecipesChange={handleSelectedCitedRecipesChange} />
						</div>
					</section>

					<section className="border-t border-border px-4 pb-5 pt-5">
						<Label htmlFor="tags" className={fieldLabel}>
							태그 <span className="font-normal text-ink-soft">(쉼표로 구분)</span>
						</Label>
						<Input id="tags" placeholder="예: 김치찌개, 한식, 간단요리" className="mt-1.5" {...form.register("tags")} />
						{errors.tags && <p className={errorText}>{errors.tags.message}</p>}
					</section>
				</Sheet>

				{/* 내 정리: 다른 사람에게는 보이지 않는 주인의 도구 (DESIGN.md Interface Grammar 3) */}
				<Sheet className="px-4 pb-5 pt-5">
					<SectionHeading>내 정리</SectionHeading>
					<fieldset className="mt-3">
						<legend className={fieldLabel}>
							색상 라벨 <span className="font-normal text-ink-soft">(나의 레시피북에서 거를 때 써요)</span>
						</legend>
						<ColorLabelPicker
							className="mt-2"
							value={selectedColor}
							onChange={(next) => form.setValue("color_label", next, { shouldValidate: true })}
						/>
					</fieldset>

					<Controller
						control={form.control}
						name="is_public"
						render={({ field }) => (
							<fieldset className="mt-4">
								<legend className={fieldLabel}>공개 범위</legend>
								<RadioGroup value={field.value.toString()} onValueChange={(value) => field.onChange(value === "true")} className="mt-1">
									<label htmlFor="public" className="flex min-h-12 items-center gap-3">
										<RadioGroupItem value="true" id="public" />
										<span className="text-label text-ink">
											공개 <span className="text-ink-soft">· 누구나 보고 만들어 볼 수 있어요</span>
										</span>
									</label>
									<label htmlFor="private" className="flex min-h-12 items-center gap-3">
										<RadioGroupItem value="false" id="private" />
										<span className="text-label text-ink">
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
				<Button type="submit" form="recipe-form" disabled={isSubmitting} className="h-12 w-full text-body">
					{isSubmitting ? (isEditMode ? "고치는 중..." : "저장하는 중...") : isEditMode ? "고친 내용 저장" : "레시피 저장"}
				</Button>
			</div>
		</div>
	)
}
