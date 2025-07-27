import { createSupabaseBrowserClient } from "./supabase-client"

/**
 * 안전한 Public ID 생성 (8자리 영문+숫자 조합)
 * 예: sp7k2m9x, uf8n3q5r
 */
export function generatePublicId(): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	let result = ""

	// 'sp' 접두어로 Spoonie 식별
	result = "sp"

	// 6자리 랜덤 문자열 추가
	for (let i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length))
	}

	return result
}

/**
 * 유니크한 Public ID 생성 (DB 중복 확인)
 */
export async function generateUniquePublicId(maxAttempts: number = 20): Promise<string> {
	const supabase = createSupabaseBrowserClient()

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const publicId = generatePublicId()

		// DB에서 중복 확인
		const { data, error } = await supabase.from("profiles").select("public_id").eq("public_id", publicId).maybeSingle()

		if (error) {
			console.error("Public ID check error:", error)
			continue
		}

		// 중복되지 않으면 반환
		if (!data) {
			return publicId
		}
	}

	// 최대 시도 횟수 초과 시 타임스탬프 추가
	const fallback = generatePublicId() + Date.now().toString().slice(-2)
	return fallback
}

/**
 * Public ID로 사용자 UUID 조회 (서버에서만 사용)
 */
export async function getUUIDFromPublicId(publicId: string): Promise<string | null> {
	const supabase = createSupabaseBrowserClient()

	const { data, error } = await supabase.from("profiles").select("id").eq("public_id", publicId).maybeSingle()

	if (error || !data) {
		return null
	}

	return data.id
}
