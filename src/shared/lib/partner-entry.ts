import { safeNextPath } from "@/shared/lib/safe-next-path"

export type PartnerEntrySource = "partner_creator" | "partner_brand"

export const partnerEntryCopy: Record<
	PartnerEntrySource,
	{ signupHint: string; loginHint: string; identityTitle: string; identityBody: string }
> = {
	partner_creator: {
		signupHint: "Spoonie 계정을 만든 뒤 이 초대 페이지로 돌아와, 기존 Instagram 레시피를 첫 Recipe로 옮길 수 있습니다.",
		loginHint: "이미 Spoonie 계정이 있다면 로그인 후 이 초대 페이지로 돌아옵니다.",
		identityTitle: "Recipe에 표시할 이름",
		identityBody: "크리에이터명이나 활동명을 적어 주세요. 출처와 프로필에 이 이름이 보이고, 나중에 바꿀 수 있습니다.",
	},
	partner_brand: {
		signupHint: "브랜드 담당 Spoonie 계정을 만든 뒤 이 초대 페이지로 돌아와, 기존 제품 활용 레시피를 첫 Recipe로 옮길 수 있습니다.",
		loginHint: "이미 사용할 Spoonie 계정이 있다면 로그인 후 이 초대 페이지로 돌아옵니다.",
		identityTitle: "Recipe에 표시할 브랜드명",
		identityBody: "브랜드명이나 운영 계정명을 적어 주세요. 출처와 프로필에 이 이름이 보이고, 나중에 바꿀 수 있습니다.",
	},
}

export function getPartnerAuthCopy(next: string, source: PartnerEntrySource | null) {
	if (!source) return null

	const route = safeNextPath(next).split(/[?#]/, 1)[0]
	if (route === "/recipes/new") {
		const recipe = source === "partner_creator" ? "Recipe" : "활용 Recipe"
		return {
			signupHint: `계정을 만든 뒤 내 ${recipe} 작성 화면으로 이동합니다. 기존 콘텐츠 제출은 선택 사항입니다.`,
			loginHint: `로그인 후 내 ${recipe} 작성 화면으로 이동합니다.`,
			emailSentBody: `메일의 인증 링크를 누르면 내 ${recipe} 작성 화면으로 이동할 수 있습니다.`,
		}
	}

	return {
		...partnerEntryCopy[source],
		emailSentBody:
			source === "partner_creator"
				? "메일의 인증 링크를 누르면 크리에이터 초대 페이지로 돌아와 기존 콘텐츠를 제출할 수 있습니다."
				: "메일의 인증 링크를 누르면 브랜드 초대 페이지로 돌아와 기존 제품 활용 자료를 제출할 수 있습니다.",
	}
}

export function parsePartnerEntrySource(raw: string | null | undefined): PartnerEntrySource | null {
	return raw === "partner_creator" || raw === "partner_brand" ? raw : null
}

type AuthEntrySearchParams = Record<string, string | string[] | undefined>

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value
}

export function resolveAuthEntryContext(query: AuthEntrySearchParams) {
	return {
		next: safeNextPath(firstSearchParam(query.next)),
		partnerSource: parsePartnerEntrySource(firstSearchParam(query.from)),
	}
}

export function authEntryHref(
	path: "/login" | "/signup" | "/forgot-password" | "/reset-password",
	next: string,
	source: PartnerEntrySource | null,
): string {
	const params = new URLSearchParams()
	if (next !== "/") params.set("next", next)
	if (source) params.set("from", source)
	const query = params.toString()
	return query ? path + "?" + query : path
}

export function withPartnerEntry(path: string, source: PartnerEntrySource | null): string {
	const safePath = safeNextPath(path)
	if (!source) return safePath

	const url = new URL(safePath, "https://spoonie.invalid")
	url.searchParams.set("entry", source)
	return url.pathname + url.search + url.hash
}

export function authCallbackUrl(origin: string, next: string, source: PartnerEntrySource | null): string {
	const params = new URLSearchParams()
	if (next !== "/") params.set("next", safeNextPath(next))
	if (source) params.set("entry", source)
	const query = params.toString()
	return origin.replace(/\/$/, "") + "/auth/callback" + (query ? "?" + query : "")
}
