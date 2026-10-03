import { describe, expect, it } from "vitest"
import { buildProfileUpdate } from "./profile-update"

describe("buildProfileUpdate", () => {
	it("이름이 같으면 횟수를 올리지 않고, 사진이 없으면 null", () =>
		expect(buildProfileUpdate({ username: "a", profileMessage: "m" }, { username: "a", username_changed_count: 2 }, undefined)).toEqual({ username: "a", profile_message: "m", avatar_url: null }))
	it("이름이 바뀌면 횟수 +1 (처음이면 1)", () => {
		expect(buildProfileUpdate({ username: "b", profileMessage: "" }, { username: "a", username_changed_count: 2 }, "u")).toEqual({ username: "b", profile_message: "", avatar_url: "u", username_changed_count: 3 })
		expect(buildProfileUpdate({ username: "b", profileMessage: "" }, null, null)).toMatchObject({ username_changed_count: 1 })
	})
})
