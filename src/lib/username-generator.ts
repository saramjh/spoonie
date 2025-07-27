import { createSupabaseBrowserClient } from "./supabase-client"

// 형용사 배열 (한국 요리 관련)
const ADJECTIVES = [
	"맛있는",
	"달콤한",
	"고소한",
	"매콤한",
	"시원한",
	"따뜻한",
	"신선한",
	"바삭한",
	"쫄깃한",
	"부드러운",
	"향긋한",
	"깔끔한",
	"진한",
	"담백한",
	"톡톡한",
	"쫄깃한",
	"촉촉한",
	"고급진",
	"특별한",
	"완벽한",
	"건강한",
	"영양가득",
	"정성스런",
	"엄마표",
	"집밥",
	"화끈한",
	"얼큰한",
	"개운한",
	"담뜩한",
	"진짜",
]

// 요리 이름 배열 (한국 음식 위주)
const DISHES = [
	"김치",
	"불고기",
	"비빔밥",
	"갈비",
	"삼겹살",
	"냉면",
	"된장찌개",
	"김치찌개",
	"순두부",
	"떡볶이",
	"치킨",
	"파전",
	"잡채",
	"만두",
	"국수",
	"라면",
	"밥상",
	"한상",
	"도시락",
	"백반",
	"덮밥",
	"볶음밥",
	"컵밥",
	"죽",
	"수프",
	"스튜",
	"파스타",
	"피자",
	"샐러드",
	"샌드위치",
	"토스트",
	"베이글",
	"팬케이크",
	"와플",
	"케이크",
	"쿠키",
	"빵",
	"마카롱",
	"푸딩",
	"젤리",
]

/**
 * 랜덤한 유저명을 생성합니다 (형용사 + 요리이름 + 숫자)
 * @returns string - 생성된 유저명
 */
export function generateRandomUsername(): string {
	const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
	const dish = DISHES[Math.floor(Math.random() * DISHES.length)]
	const number = Math.floor(Math.random() * 9999) + 1 // 1-9999

	return `${adjective}${dish}${number}`
}

/**
 * 유니크한 유저명을 생성합니다 (DB에서 중복 확인)
 * @param maxAttempts - 최대 시도 횟수 (기본값: 10)
 * @returns Promise<string> - 유니크한 유저명
 */
export async function generateUniqueUsername(maxAttempts: number = 10): Promise<string> {
	const supabase = createSupabaseBrowserClient()

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const username = generateRandomUsername()

		// DB에서 중복 확인
		const { data, error } = await supabase.from("profiles").select("username").eq("username", username).maybeSingle()

		if (error) {
			console.error("Username check error:", error)
			continue
		}

		// 중복되지 않으면 반환
		if (!data) {
			return username
		}
	}

	// 최대 시도 횟수 초과 시 타임스탬프 추가
	const fallback = generateRandomUsername() + Date.now().toString().slice(-4)
	return fallback
}

/**
 * 유저명 유효성 검사
 * @param username - 검사할 유저명
 * @returns { isValid: boolean, error?: string }
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
	if (!username || username.trim().length === 0) {
		return { isValid: false, error: "사용자 이름을 입력해주세요." }
	}

	// 바이트 길이 계산 (한글 2바이트, 영문/숫자 1바이트)
	let byteLength = 0
	for (let i = 0; i < username.length; i++) {
		const charCode = username.charCodeAt(i)
		if (charCode > 127) {
			byteLength += 2 // 한글 등 2바이트 문자
		} else {
			byteLength += 1 // 영문, 숫자 등 1바이트 문자
		}
	}

	if (byteLength > 20) {
		return { isValid: false, error: "이름이 너무 깁니다. (한글 10자, 영문 20자 이내)" }
	}

	// 금지어 검사
	const forbiddenWords = ["바보", "멍청이", "시발", "새끼", "fuck", "shit", "damn", "hell"]
	const containsForbiddenWord = forbiddenWords.some((word) => username.toLowerCase().includes(word.toLowerCase()))

	if (containsForbiddenWord) {
		return { isValid: false, error: "사용할 수 없는 단어가 포함되어 있습니다." }
	}

	return { isValid: true }
}

/**
 * 유저명 중복 확인
 * @param username - 확인할 유저명
 * @param currentUserId - 현재 사용자 ID (자기 자신은 제외)
 * @returns Promise<boolean> - 사용 가능하면 true
 */
export async function checkUsernameAvailability(username: string, currentUserId?: string): Promise<boolean> {
	const supabase = createSupabaseBrowserClient()

	let query = supabase.from("profiles").select("id").eq("username", username)

	// 현재 사용자는 제외
	if (currentUserId) {
		query = query.neq("id", currentUserId)
	}

	const { data, error } = await query.maybeSingle()

	if (error) {
		console.error("Username availability check error:", error)
		return false
	}

	return !data // 데이터가 없으면 사용 가능
}
