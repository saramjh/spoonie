/**
 * /llms.txt: AI 검색(ChatGPT·Perplexity·Claude 등)이 사이트를 이해하도록 돕는 안내 파일 (https://llmstxt.org 형식).
 * Spoonie가 무엇인지, 어떤 페이지가 있는지, 공개 레시피 목록(제목·요약·주소)을 담는다.
 * 사이트맵과 같이 로그인 정보 없이 공개 데이터로 만들고 1시간마다 다시 만든다.
 * 지어낸 수치·후기는 넣지 않는다: 레시피 수는 실제로 센 값만 쓴다.
 */

import { createSupabasePublicClient } from "@/shared/infra/supabase-public"

export const revalidate = 3600

const MAX_RECIPES = 200

type RecipeRow = { id: string; title: string | null; description: string | null; servings: number | null; cooking_time_minutes: number | null; tags: string[] | null }

function oneLine(text: string | null, max = 120) {
	const t = (text || "").replace(/\s+/g, " ").trim()
	return t.length > max ? t.slice(0, max - 1) + "…" : t
}

export async function GET() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
	let recipes: RecipeRow[] = []
	try {
		const { data, error } = await createSupabasePublicClient()
			.from("items")
			.select("id, title, description, servings, cooking_time_minutes, tags")
			.eq("is_public", true)
			.eq("item_type", "recipe")
			.order("created_at", { ascending: false })
			.limit(MAX_RECIPES)
		if (!error && data) recipes = data as RecipeRow[]
	} catch {
		// 목록을 못 받아도 사이트 안내는 보낸다
	}

	const lines = [
		"# Spoonie",
		"",
		"> 집에서 한 요리를 레시피(재료·분량·단계별 사진)로 남기고, 요리할 때 다시 꺼내 보며, 다른 사람의 레시피를 바탕으로 자기 버전을 만드는 한국어 레시피 공유 서비스. 별칭: 스푸니.",
		"",
		"레시피 페이지에는 인분, 조리 시간, 재료와 분량, 단계별 설명이 HTML 본문과 schema.org Recipe 구조화 데이터로 함께 들어 있다. 레시피는 가입 없이 모두 볼 수 있다.",
		"참고한 레시피를 인용해 새 레시피를 쓰면 원본과 이어진다(이어진 레시피). 레시피로 실제로 만들어 본 기록(레시피드)은 사진과 글 중심이며 검색 색인 대상이 아니다.",
		"",
		"## 주요 페이지",
		"",
		`- [홈](${baseUrl}/): 최근 공개 레시피와 요리 기록`,
		`- [레시피 찾기](${baseUrl}/search): 요리 이름·재료로 레시피 검색, 실제로 만들어 본 기록`,
		`- [사이트맵](${baseUrl}/sitemap.xml): 공개 레시피와 작성자 프로필 전체 주소`,
		"",
		`## 레시피 (최근 공개 ${recipes.length}개)`,
		"",
		...recipes.map((r) => {
			const meta = [r.servings ? `${r.servings}인분` : "", r.cooking_time_minutes ? `${r.cooking_time_minutes}분` : ""].filter(Boolean).join(", ")
			const summary = oneLine(r.description)
			return `- [${oneLine(r.title, 60) || "레시피"}](${baseUrl}/recipes/${r.id})${meta ? ` (${meta})` : ""}${summary ? `: ${summary}` : ""}`
		}),
		"",
	]

	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
	})
}
