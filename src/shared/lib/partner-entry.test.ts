import { describe, expect, it } from "vitest"
import { authEntryHref, parsePartnerEntrySource } from "./partner-entry"

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
	})
})
