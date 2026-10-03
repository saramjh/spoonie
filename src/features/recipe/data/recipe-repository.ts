/**
 * 레시피 저장소: 레시피의 DB·저장소(Storage) 읽기·쓰기를 한곳에 모은다.
 * RecipeForm.tsx, RecipeActivity.tsx에서 호출 순서·오류 문구·오류 처리 방식을 바꾸지 않고 옮겨 왔다.
 * (재료·단계 insert의 오류를 확인하지 않는 것도 옮기기 전과 같다)
 * Supabase 클라이언트는 부르는 쪽에서 받는다 (화면이 쓰던 같은 클라이언트로 동작하게).
 */

import type { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { uploadVariants } from "@/shared/infra/image-optimization"
import type { OptimizedImage } from "@/shared/infra/image-utils"
import type { Item } from "@/types/item"
import type { RecipeActivity } from "../contracts"
import { toIngredientRows, toInstructionRows } from "../domain/recipe-form"
import type { RecipeIngredientInput, RecipeInstructionInput } from "../contracts"

type Db = ReturnType<typeof createSupabaseBrowserClient>

// 수정 화면: 참고 레시피의 제목·사진·작성자를 CitedRecipeSearch가 쓰는 모양으로 가져온다. 실패하면 로그만 남기고 null
export async function fetchCitedRecipes(supabase: Db, ids: string[]): Promise<Item[] | null> {
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
		.in("id", ids)
		.eq("item_type", "recipe")

	if (error) {
		console.error("Error fetching cited recipes", error)
		return null
	}
	// 데이터 구조를 CitedRecipeSearch가 기대하는 형태로 변환
	const formattedRecipes = data.map((recipe) => {
		const authorProfile = Array.isArray(recipe.author) ? recipe.author[0] : recipe.author
		return {
			...recipe,
			item_id: recipe.id, // item_id 필드 추가
			display_name: authorProfile?.username,
			username: authorProfile?.username,
			avatar_url: authorProfile?.avatar_url,
			user_public_id: authorProfile?.public_id,
		}
	})
	return formattedRecipes as unknown as Item[]
}

// 단계 사진: 새 사진은 올리고(크기별 버전 포함) 주소를, 기존 사진은 그 주소를, 없으면 null
export async function uploadInstructionImages(supabase: Db, bucketId: string, userId: string, instructionImages: (OptimizedImage | null)[]) {
	return Promise.all(
		instructionImages.map(async (image, index) => {
			if (image && image.file.size > 0) {
				const fileName = `${userId}/${Date.now()}-instruction-${index}-${Math.random().toString(36).slice(2, 10)}.jpg`
				const { error: uploadError } = await supabase.storage.from(bucketId).upload(fileName, image.file, { cacheControl: "31536000", contentType: "image/jpeg" })
				if (uploadError) throw new Error(`조리법 이미지 업로드 실패: ${uploadError.message}`)
				await uploadVariants(bucketId, fileName, image.file)
				const { data: publicUrlData } = supabase.storage.from(bucketId).getPublicUrl(fileName)
				return publicUrlData.publicUrl
			} else if (image) {
				return image.preview
			} else {
				return null
			}
		})
	)
}

// items를 새로 넣거나 고치고, 재료·단계는 지우고 다시 넣는다
export async function saveRecipeRows<P extends object, I extends RecipeInstructionInput>(
	supabase: Db,
	args: { existingId: string | null; itemPayload: P; ingredients: RecipeIngredientInput[]; instructions: I[] }
) {
	let itemId: string

	if (args.existingId) {
		const { data: updatedItem, error: itemError } = await supabase.from("items").update(args.itemPayload).eq("id", args.existingId).select("id").single()
		if (itemError) throw new Error(`레시피 수정 실패: ${itemError.message}`)
		itemId = updatedItem.id

		await supabase.from("ingredients").delete().eq("item_id", itemId)
		await supabase.from("instructions").delete().eq("item_id", itemId)
	} else {
		const { data: newItem, error: itemError } = await supabase.from("items").insert(args.itemPayload).select("id").single()
		if (itemError) throw new Error(`레시피 생성 실패: ${itemError.message}`)
		itemId = newItem.id
	}

	// 재료 순서 정보 포함하여 저장 (드래그앤드롭 순서 유지)
	const ingredientsToInsert = toIngredientRows(args.ingredients, itemId)
	await supabase.from("ingredients").insert(ingredientsToInsert)

	const instructionsToInsert = toInstructionRows(args.instructions, itemId)
	await supabase.from("instructions").insert(instructionsToInsert)

	return { itemId, ingredientsToInsert }
}

// 레시피 상세의 사람별 한 줄 (get_recipe_activity). 오류는 던진다 (SWR이 받는다)
export async function fetchRecipeActivity(supabase: Db, recipeId: string): Promise<RecipeActivity | null> {
	const { data, error } = await supabase.rpc("get_recipe_activity", { recipe: recipeId })
	if (error) throw error
	return data as RecipeActivity | null
}
