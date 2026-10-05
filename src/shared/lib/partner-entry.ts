export type PartnerEntrySource = "partner_creator" | "partner_brand"

export const partnerEntryCopy: Record<
	PartnerEntrySource,
	{ signupHint: string; loginHint: string }
> = {
	partner_creator: {
		signupHint: "가입하면 바로 기존 레시피를 Recipe로 옮기는 화면으로 이어집니다.",
		loginHint: "로그인하면 바로 기존 레시피를 Recipe로 옮기는 화면으로 이어집니다.",
	},
	partner_brand: {
		signupHint: "가입하면 바로 제품 활용 Recipe 작성 화면으로 이어집니다.",
		loginHint: "로그인하면 바로 제품 활용 Recipe 작성 화면으로 이어집니다.",
	},
}

export function parsePartnerEntrySource(raw: string | null | undefined): PartnerEntrySource | null {
	return raw === "partner_creator" || raw === "partner_brand" ? raw : null
}

export function authEntryHref(
	path: "/login" | "/signup",
	next: string,
	source: PartnerEntrySource | null,
): string {
	const params = new URLSearchParams()
	if (next !== "/") params.set("next", next)
	if (source) params.set("from", source)
	const query = params.toString()
	return query ? path + "?" + query : path
}
