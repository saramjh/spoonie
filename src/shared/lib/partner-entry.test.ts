import { describe, expect, it } from "vitest"
import { authCallbackUrl, authEntryHref, parsePartnerEntrySource, withPartnerEntry } from "./partner-entry"

describe("partner entry context", () => {
	it("허용한 partner source만 유지한다", () => {
		expect(parsePartnerEntrySource("partner_creator")).toBe("partner_creator")
		expect(parsePartnerEntrySource("partner_brand")).toBe("partner_brand")
		expect(parsePartnerEntrySource("premamont")).toBeNull()
		expect(parsePartnerEntrySource(null)).toBeNull()
	})

	it("인증 화면을 오가도 next와 partner source를 유지한다", () => {
		expect(authEntryHref("/login", "/recipes/new", "partner_creator")).toBe(
			"/login?next=%2Frecipes%2Fnew&from=partner_creator",
		)
		expect(authEntryHref("/signup", "/", null)).toBe("/signup")
		expect(authEntryHref("/forgot-password", "/recipes/new", "partner_brand")).toBe(
			"/forgot-password?next=%2Frecipes%2Fnew&from=partner_brand",
		)
	})

	it("인증을 마친 뒤 작성 화면에 partner source를 별도 entry로 붙인다", () => {
		expect(withPartnerEntry("/recipes/new", "partner_creator")).toBe(
			"/recipes/new?entry=partner_creator",
		)
		expect(withPartnerEntry("/recipes/new?fork=abc", "partner_brand")).toBe(
			"/recipes/new?fork=abc&entry=partner_brand",
		)
		expect(withPartnerEntry("//evil.example", "partner_brand")).toBe("/?entry=partner_brand")
	})

	it("이메일·OAuth callback에도 next와 source를 함께 보존한다", () => {
		expect(authCallbackUrl("https://spoonie.kr", "/recipes/new", "partner_creator")).toBe(
			"https://spoonie.kr/auth/callback?next=%2Frecipes%2Fnew&entry=partner_creator",
		)
	})
})
