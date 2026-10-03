// 지금 동작을 기록하는 테스트: PostForm에서 옮기기 전과 같은 결과
import { describe, expect, it } from "vitest"
import type { Item } from "@/types/item"
import { buildPostItemPayload, citedIdsFromRecipes, postCreationOriginField, postFormDefaults, returnToSourcePath } from "./post-form"

describe("postFormDefaults", () => {
	it("새 글은 빈 값·공개", () => expect(postFormDefaults(null)).toEqual({ title: "", content: "", is_public: true, tags: [], cited_recipe_ids: [] }))
	it("수정은 저장된 값, 인용 id는 문자열로·빈 값 제외", () =>
		expect(postFormDefaults({ title: "t", content: "c", is_public: false, tags: ["a"], cited_recipe_ids: ["r1", ""] } as unknown as Item)).toEqual({ title: "t", content: "c", is_public: false, tags: ["a"], cited_recipe_ids: ["r1"] }))
})

describe("postCreationOriginField", () => {
	it("수정 때는 비운다", () => expect(postCreationOriginField(true, "s", "cook_mode", ["s"])).toEqual({}))
	it("출처 레시피를 그대로 인용", () => expect(postCreationOriginField(false, "s", "cook_mode", ["s"])).toEqual({ creation_origin: "cook_mode" }))
	it("직접 고른 인용", () => expect(postCreationOriginField(false, "s", "recipe_detail", ["x"])).toEqual({ creation_origin: "manual" }))
	it("인용 없음", () => expect(postCreationOriginField(false, null, null, [])).toEqual({ creation_origin: null }))
})

describe("buildPostItemPayload", () => {
	it("제목은 공백을 지우고 비면 null", () =>
		expect(buildPostItemPayload({ title: "  ", content: "c", is_public: true, tags: [], cited_recipe_ids: [] }, { userId: "u", imageUrls: ["i"], thumbnailIndex: 0, isEditMode: false, sourceRecipeId: null, sourceOrigin: null })).toEqual({
			user_id: "u", item_type: "post", title: null, content: "c", image_urls: ["i"], tags: [], cited_recipe_ids: [], is_public: true, thumbnail_index: 0, creation_origin: null,
		}))
})

describe("기타", () => {
	it("인용 id: id 또는 item_id, 빈 것 제외", () => expect(citedIdsFromRecipes([{ id: "a" }, { item_id: "b" }, {}] as unknown as Item[])).toEqual(["a", "b"]))
	it("출처로 돌아가기", () => {
		expect(returnToSourcePath(false, "s", ["s"])).toBe("/recipes/s#made-heading")
		expect(returnToSourcePath(true, "s", ["s"])).toBeNull()
		expect(returnToSourcePath(false, "s", ["x"])).toBeNull()
	})
})
