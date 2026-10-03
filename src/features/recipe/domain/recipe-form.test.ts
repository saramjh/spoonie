// 지금 동작을 기록하는 테스트: RecipeForm에서 옮기기 전과 같은 결과가 나와야 한다
import { describe, expect, it } from "vitest"
import type { Item, ItemDetail } from "@/types/item"
import {
	attachInstructionImages,
	buildRecipeItemPayload,
	creationOriginField,
	editDefaults,
	forkDefaults,
	reorderIngredients,
	toIngredientRows,
	toInstructionRows,
} from "./recipe-form"

const item = (over: Partial<Item>): Item => ({ id: "r1", item_id: "r1", user_id: "u1", item_type: "recipe", created_at: "", title: null, content: null, description: null, image_urls: null, thumbnail_index: null, tags: null, is_public: true, color_label: null, servings: null, cooking_time_minutes: null, recipe_id: null, cited_recipe_ids: null, likes_count: 0, comments_count: 0, is_liked: false, is_following: false, ...over }) as Item

describe("editDefaults", () => {
	it("빈 레시피는 기본 한 줄씩", () => {
		expect(editDefaults(item({}))).toEqual({
			title: "", description: "", servings: 1, cooking_time_minutes: 1, is_public: true,
			ingredients: [{ name: "", amount: 1, unit: "개" }],
			instructions: [{ description: "", image_url: "" }],
			color_label: null, tags: "", cited_recipe_ids: [],
		})
	})
	it("재료는 order_index 순서, 단위가 없으면 개, 태그는 쉼표로", () => {
		const data = item({
			title: "찜닭", servings: 3, is_public: false, color_label: "red", tags: ["a", "b"], cited_recipe_ids: ["x"],
			ingredients: [{ name: "B", amount: 2, unit: "", order_index: 2 }, { name: "A", amount: 1, unit: "g", order_index: 1 }],
			instructions: [{ step_number: 1, description: "썬다" }],
		})
		expect(editDefaults(data)).toMatchObject({
			title: "찜닭", servings: 3, is_public: false, color_label: "red", tags: "a, b", cited_recipe_ids: ["x"],
			ingredients: [{ name: "A", amount: 1, unit: "g" }, { name: "B", amount: 2, unit: "개" }],
			instructions: [{ description: "썬다", image_url: "" }],
		})
		// 원래 배열도 정렬된다 (옮기기 전 동작 그대로)
		expect(data.ingredients?.map((i) => i.name)).toEqual(["A", "B"])
	})
})

describe("forkDefaults", () => {
	it("사진·색·제목은 비우고 원본을 참고 레시피로", () => {
		const src = { ...item({ id: "orig", servings: 2, cooking_time_minutes: 30, color_label: "blue", tags: ["t"] }), ingredients: [{ name: "달걀", amount: 2, unit: "개" }], instructions: [{ step_number: 1, description: "푼다", image_url: "u" }] } as ItemDetail
		expect(forkDefaults(src)).toEqual({
			title: "", description: "", servings: 2, cooking_time_minutes: 30, is_public: true,
			ingredients: [{ name: "달걀", amount: 2, unit: "개" }],
			instructions: [{ description: "푼다", image_url: "" }],
			color_label: null, tags: "t", cited_recipe_ids: ["orig"],
		})
	})
})

describe("reorderIngredients", () => {
	it("칸 id로 원래 값을 찾아 새 순서로, 못 찾으면 끌어온 값", () => {
		const current = [{ name: "A", amount: 1, unit: "g" }, { name: "B", amount: 2, unit: "개" }]
		expect(reorderIngredients([{ id: "f2" }, { id: "f1" }, { id: "zz", name: "C" }], ["f1", "f2"], current)).toEqual([
			current[1], current[0], { name: "C", amount: 0, unit: "" },
		])
	})
})

describe("creationOriginField", () => {
	it("수정 때는 비운다", () => expect(creationOriginField(true, "o", ["o"])).toEqual({}))
	it("원본을 인용한 fork", () => expect(creationOriginField(false, "o", ["o"])).toEqual({ creation_origin: "fork" }))
	it("직접 고른 인용", () => expect(creationOriginField(false, undefined, ["x"])).toEqual({ creation_origin: "manual" }))
	it("fork로 시작했지만 원본 인용을 지움", () => expect(creationOriginField(false, "o", ["x"])).toEqual({ creation_origin: "manual" }))
	it("인용 없음", () => expect(creationOriginField(false, undefined, [])).toEqual({ creation_origin: null }))
})

describe("저장 행 만들기", () => {
	const values = { title: "t", description: "d", servings: 2, cooking_time_minutes: 10, is_public: true, ingredients: [{ name: "A", amount: 1, unit: "g" }], instructions: [{ description: "s1" }, { description: "s2" }], color_label: null, tags: ["x"], cited_recipe_ids: [] }
	it("items 값", () => {
		expect(buildRecipeItemPayload(values, { userId: "u", imageUrls: ["i"], thumbnailIndex: 0, isEditMode: false, forkFromId: undefined })).toEqual({
			user_id: "u", item_type: "recipe", title: "t", description: "d", servings: 2, cooking_time_minutes: 10, is_public: true,
			image_urls: ["i"], color_label: null, tags: ["x"], cited_recipe_ids: [], thumbnail_index: 0, creation_origin: null,
		})
	})
	it("단계 사진, 재료·단계 번호", () => {
		const withImages = attachInstructionImages(values.instructions, ["p1", null])
		expect(withImages).toEqual([{ description: "s1", image_url: "p1" }, { description: "s2", image_url: undefined }])
		expect(toIngredientRows(values.ingredients, "it")).toEqual([{ name: "A", amount: 1, unit: "g", item_id: "it", order_index: 1 }])
		expect(toInstructionRows(withImages, "it")[1]).toEqual({ description: "s2", image_url: undefined, item_id: "it", step_number: 2 })
	})
})

import { markRemind } from "./recipe-activity"
describe("markRemind", () => {
	const day = 24 * 60 * 60 * 1000, now = Date.UTC(2026, 9, 3)
	it("30일 안에 시작했고 기록 없음 → 권함", () => expect(markRemind({ role: "viewer", last_cook_start: new Date(now - 5 * day).toISOString(), recorded: false }, now)).toMatchObject({ remind: true }))
	it("30일 넘음 → 안 권함", () => expect(markRemind({ role: "viewer", last_cook_start: new Date(now - 40 * day).toISOString(), recorded: false }, now)).toMatchObject({ remind: false }))
	it("기록 있음·작성자·null은 손대지 않음", () => {
		expect(markRemind({ role: "viewer", last_cook_start: new Date(now).toISOString(), recorded: true }, now)).not.toHaveProperty("remind")
		expect(markRemind(null, now)).toBeNull()
	})
})

import { setBookmarked, setLiked, shiftCount } from "@/features/social/domain/social-state"
describe("social-state", () => {
	const base = { is_liked: false, likes_count: 3, is_bookmarked: true, bookmarks_count: 1 } as unknown as Item
	it("좋아요: 절대 상태, 같은 상태면 그대로", () => {
		expect(setLiked(true)(base)).toEqual({ is_liked: true, likes_count: 4 })
		expect(setLiked(false)(base)).toEqual({})
	})
	it("저장 취소, 0 아래로 안 내려감", () => {
		expect(setBookmarked(false)(base)).toEqual({ is_bookmarked: false, bookmarks_count: 0 })
		expect(setBookmarked(false)({ ...base, bookmarks_count: 0 } as Item)).toEqual({ is_bookmarked: false, bookmarks_count: 0 })
	})
	it("팔로우 수", () => expect(shiftCount({ followers: 0, following: 2 }, "followers", -1)).toEqual({ followers: 0, following: 2 }))
})
