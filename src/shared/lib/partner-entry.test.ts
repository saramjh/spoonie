import { describe, expect, it } from "vitest"
import {
	authCallbackUrl,
	authEntryHref,
	getPartnerAuthCopy,
	parsePartnerEntrySource,
	resolveAuthEntryContext,
	withPartnerEntry,
} from "./partner-entry"

describe("partner entry context", () => {
	it("허용한 partner source만 유지한다", () => {
		expect(parsePartnerEntrySource("partner_creator")).toBe("partner_creator")
		expect(parsePartnerEntrySource("partner_brand")).toBe("partner_brand")
		expect(parsePartnerEntrySource("premamont")).toBeNull()
		expect(parsePartnerEntrySource(null)).toBeNull()
	})

	it("서버 auth page가 query를 한 번만 검증해 같은 context를 받는다", () => {
		expect(
			resolveAuthEntryContext({
				next: ["/partners/creators?setup=1#setup", "/ignored"],
				from: ["partner_creator", "partner_brand"],
			}),
		).toEqual({
			next: "/partners/creators?setup=1#setup",
			partnerSource: "partner_creator",
		})
		expect(resolveAuthEntryContext({ next: "//evil.example", from: "unknown" })).toEqual({
			next: "/",
			partnerSource: null,
		})
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

	it("계정 우선 초기 셋업 경로도 인증 전후에 그대로 보존한다", () => {
		const creatorNext = "/partners/creators?setup=1#setup"
		const brandNext = "/partners/brands?setup=1#setup"

		expect(authEntryHref("/signup", creatorNext, "partner_creator")).toBe(
			"/signup?next=%2Fpartners%2Fcreators%3Fsetup%3D1%23setup&from=partner_creator",
		)
		expect(withPartnerEntry(creatorNext, "partner_creator")).toBe(
			"/partners/creators?setup=1&entry=partner_creator#setup",
		)
		expect(authCallbackUrl("https://spoonie.kr", brandNext, "partner_brand")).toBe(
			"https://spoonie.kr/auth/callback?next=%2Fpartners%2Fbrands%3Fsetup%3D1%23setup&entry=partner_brand",
		)
	})

	it("직접 Recipe 작성 선택은 가입·로그인·인증 안내도 작성 화면을 가리킨다", () => {
		const creator = getPartnerAuthCopy("/recipes/new", "partner_creator")
		expect(creator?.signupHint).toContain("Recipe 작성")
		expect(creator?.loginHint).toContain("Recipe 작성")
		expect(creator?.emailSentBody).toContain("Recipe 작성")
		expect(creator?.signupHint).not.toContain("Instagram")
		expect(creator?.emailSentBody).not.toContain("초대 페이지")

		const brand = getPartnerAuthCopy("/recipes/new?from=promotion", "partner_brand")
		expect(brand?.signupHint).toContain("활용 Recipe 작성")
		expect(brand?.loginHint).toContain("활용 Recipe 작성")
		expect(brand?.emailSentBody).toContain("활용 Recipe 작성")
	})

	it("기존 콘텐츠 주소 제출을 선택한 경우에만 안내 페이지 재방문을 설명한다", () => {
		const creator = getPartnerAuthCopy("/partners/creators?setup=1#setup", "partner_creator")
		expect(creator?.signupHint).toContain("Instagram")
		expect(creator?.emailSentBody).toContain("크리에이터 초대 페이지")
		expect(creator?.loginHint).toContain("초대 페이지")

		const brand = getPartnerAuthCopy("/partners/brands?setup=1#setup", "partner_brand")
		expect(brand?.signupHint).toContain("제품 활용")
		expect(brand?.emailSentBody).toContain("브랜드 초대 페이지")
		expect(getPartnerAuthCopy("/recipes/new", null)).toBeNull()
	})

	it("이메일·OAuth callback에도 next와 source를 함께 보존한다", () => {
		expect(authCallbackUrl("https://spoonie.kr", "/recipes/new", "partner_creator")).toBe(
			"https://spoonie.kr/auth/callback?next=%2Frecipes%2Fnew&entry=partner_creator",
		)
	})
})
