/**
 * /llms.txt: 비Google AI 에이전트가 Spoonie의 공개 콘텐츠 구조를 이해하도록 돕는 보조 안내 파일.
 * Google 검색 랭킹용 파일이 아니며, 실제 공개 데이터만 싣는다.
 */

import { createSupabasePublicClient } from "@/shared/infra/supabase-public"
import { isSearchIndexableRecipeed, isSearchIndexableTopic, isTopicContributingRecipeed } from "@/features/discovery/domain/search-exposure"
import { fetchAllPublicDiscoveryItems } from "@/features/discovery/data/public-assets"
import { normalizeTags, topicHref } from "@/shared/lib/topics"

export const revalidate = 3600
const MAX_PER_TYPE = 200

type RecipeRow = { id: string; user_id: string; title: string | null; description: string | null; servings: number | null; cooking_time_minutes: number | null; tags: string[] | null }
type PostRow = { id: string; user_id: string; title: string | null; content: string | null; tags: string[] | null; image_urls: string[] | null; cited_recipe_ids: string[] | null }

function oneLine(text: string | null, max = 120) {
	const t = (text || "").replace(/\s+/g, " ").trim()
	return t.length > max ? t.slice(0, max - 1) + "…" : t
}

export async function GET() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
	let recipes: RecipeRow[] = []
	let posts: PostRow[] = []
	try {
		const supabase = createSupabasePublicClient()
		const [recipeResult, postResult] = await Promise.all([
			supabase.from("items").select("id, user_id, title, description, servings, cooking_time_minutes, tags").eq("is_public", true).eq("item_type", "recipe").order("created_at", { ascending: false }).limit(MAX_PER_TYPE),
			supabase.from("items").select("id, user_id, title, content, tags, image_urls, cited_recipe_ids").eq("is_public", true).eq("item_type", "post").order("created_at", { ascending: false }).limit(MAX_PER_TYPE),
		])
		if (!recipeResult.error && recipeResult.data) recipes = recipeResult.data as RecipeRow[]
		if (!postResult.error && postResult.data) posts = (postResult.data as PostRow[]).filter(isSearchIndexableRecipeed)
	} catch {
		// 공개 목록 조회가 실패해도 서비스 설명은 제공한다.
	}

	const allPublicItems = await fetchAllPublicDiscoveryItems().catch(() => [])
	const topicAssets = allPublicItems.filter((item) => item.item_type === "recipe" || isTopicContributingRecipeed(item))
	const topicStats = new Map<string, { count: number; authors: Set<string> }>()
	for (const item of topicAssets) {
		for (const tag of normalizeTags(item.tags)) {
			const stats = topicStats.get(tag) ?? { count: 0, authors: new Set<string>() }
			stats.count += 1
			stats.authors.add(item.user_id)
			topicStats.set(tag, stats)
		}
	}
	const topics = [...topicStats.entries()]
		.filter(([tag, stats]) => isSearchIndexableTopic({ tag, searchAssetCount: stats.count, distinctAuthorCount: stats.authors.size }))
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 40)

	const lines = [
		"# Spoonie",
		"",
		"> 한국어 요리 소셜 플랫폼. 레시피와 레시피드는 서로 다른 1급 공개 콘텐츠다.",
		"",
		"레시피는 재료·분량·조리 단계·사진을 갖춘 구조화된 요리법이며 schema.org Recipe로 표시한다.",
		"레시피드는 사진과 글 중심의 음식·요리·주방·식생활 기록이다. 특정 레시피를 참고해 만들 수도 있지만, 일반적인 요리 일상·후기·도구·재료 경험처럼 독립적인 이야기일 수도 있다.",
		"정상적인 공개 레시피드는 길이·사진 장수로 선별하지 않고 검색 후보로 둔다. 빈 글·테스트 placeholder·반복/링크 스팸처럼 명백한 제외 사유만 공통 자동 정책으로 걸러낸다.",
		"레시피와 레시피드는 태그 주제 페이지에서 함께 연결되며, 참고 레시피 관계가 있는 경우에는 그 관계도 별도로 표시한다.",
		"",
		"## 주요 페이지",
		"",
		`- [홈](${baseUrl}/): 최근 공개 레시피와 레시피드`,
		`- [검색](${baseUrl}/search): 레시피·레시피드·사용자 검색`,
		`- [사이트맵](${baseUrl}/sitemap.xml): 검색에 노출할 레시피, 레시피드, 주제, 작성자 프로필`,
		"",
		`## 레시피 (최근 공개 최대 ${MAX_PER_TYPE}개 중 ${recipes.length}개)`,
		"",
		...recipes.map((r) => {
			const meta = [r.servings ? `${r.servings}인분` : "", r.cooking_time_minutes ? `${r.cooking_time_minutes}분` : ""].filter(Boolean).join(", ")
			const summary = oneLine(r.description)
			return `- [${oneLine(r.title, 60) || "레시피"}](${baseUrl}/recipes/${r.id})${meta ? ` (${meta})` : ""}${summary ? `: ${summary}` : ""}`
		}),
		"",
		`## 레시피드 (정상 공개 자산 중 최근 최대 ${MAX_PER_TYPE}개, 현재 ${posts.length}개)`,
		"",
		...posts.map((p) => `- [${oneLine(p.title, 60) || oneLine(p.content, 40) || "레시피드"}](${baseUrl}/posts/${p.id})${p.content ? `: ${oneLine(p.content)}` : ""}`),
		"",
		"## 주제",
		"",
		...topics.map(([tag, stats]) => `- [#${tag}](${baseUrl}${topicHref(tag)}): 공개 검색 자산 ${stats.count}개`),
		"",
	]

	return new Response(lines.join("\n"), {
		headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
	})
}
