/**
 * 검색에 내보낼 canonical 전체와 그 콘텐츠의 실제 이미지를 제공한다.
 * 원본 콘텐츠의 index eligibility와 자동 Topic/Profile eligibility는 서로 분리한다.
 */

import type { MetadataRoute } from "next"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"
import { fetchAllPublicDiscoveryItems, type PublicDiscoveryItem } from "@/features/discovery/data/public-assets"
import {
	isSearchIndexableProfile,
	isSearchIndexableRecipeed,
	isSearchIndexableTopic,
	isTopicContributingRecipeed,
} from "@/features/discovery/domain/search-exposure"
import { normalizeTags, topicHref } from "@/shared/lib/topics"

export const revalidate = 3600

type SupabaseServerClient = ReturnType<typeof createSupabasePublicClient>
type ProfileRow = {
	id: string
	public_id: string | null
	display_name: string | null
	username: string | null
	is_profile_public: boolean | null
	updated_at: string | null
}
type InstructionImageRow = { item_id: string; image_url: string | null }

function chunks<T>(items: T[], size: number): T[][] {
	const result: T[][] = []
	for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
	return result
}

async function getProfiles(supabase: SupabaseServerClient, authorIds: string[]): Promise<ProfileRow[]> {
	const rows: ProfileRow[] = []
	for (const ids of chunks(authorIds, 200)) {
		let from = 0
		while (true) {
			const { data, error } = await supabase
				.from("profiles")
				.select("id, public_id, display_name, username, is_profile_public, updated_at")
				.in("id", ids)
				.order("id", { ascending: true })
				.range(from, from + 199)
			if (error) throw error
			const batch = (data ?? []) as ProfileRow[]
			if (!batch.length) break
			rows.push(...batch)
			from += batch.length
		}
	}
	return rows
}

async function getInstructionImages(supabase: SupabaseServerClient, recipeIds: string[]): Promise<Map<string, string[]>> {
	const byRecipe = new Map<string, string[]>()
	for (const ids of chunks(recipeIds, 200)) {
		let from = 0
		while (true) {
			const { data, error } = await supabase
				.from("instructions")
				.select("item_id, image_url")
				.in("item_id", ids)
				.not("image_url", "is", null)
				.order("id", { ascending: true })
				.range(from, from + 999)
			if (error) throw error
			const batch = (data ?? []) as InstructionImageRow[]
			if (!batch.length) break
			for (const row of batch) {
				if (!row.image_url) continue
				const images = byRecipe.get(row.item_id) ?? []
				images.push(row.image_url)
				byRecipe.set(row.item_id, images)
			}
			from += batch.length
		}
	}
	return byRecipe
}

function uniqueImages(...groups: Array<string[] | null | undefined>): string[] {
	return [...new Set(groups.flatMap((group) => group ?? []).filter(Boolean))]
}

function lastModified(row: PublicDiscoveryItem): Date {
	return new Date(row.updated_at || row.created_at)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
	const staticPages: MetadataRoute.Sitemap = [{ url: baseUrl }, { url: `${baseUrl}/partners` }]

	try {
		const supabase = createSupabasePublicClient()
		const allItems = await fetchAllPublicDiscoveryItems({}, supabase)
		const recipes = allItems.filter((item) => item.item_type === "recipe")
		const posts = allItems.filter((item) => item.item_type === "post")
		const searchPosts = posts.filter(isSearchIndexableRecipeed)
		const topicPosts = posts.filter(isTopicContributingRecipeed)

		const activity = new Map<string, { recipes: number; posts: number }>()
		for (const recipe of recipes) {
			const counts = activity.get(recipe.user_id) ?? { recipes: 0, posts: 0 }
			counts.recipes += 1
			activity.set(recipe.user_id, counts)
		}
		for (const post of searchPosts) {
			const counts = activity.get(post.user_id) ?? { recipes: 0, posts: 0 }
			counts.posts += 1
			activity.set(post.user_id, counts)
		}

		const authorIds = [...activity.keys()]
		const [profiles, instructionImages] = await Promise.all([
			getProfiles(supabase, authorIds),
			getInstructionImages(supabase, recipes.map((recipe) => recipe.id)),
		])

		const topicStats = new Map<string, { count: number; authors: Set<string> }>()
		for (const item of [...recipes, ...topicPosts]) {
			for (const tag of normalizeTags(item.tags)) {
				const stats = topicStats.get(tag) ?? { count: 0, authors: new Set<string>() }
				stats.count += 1
				stats.authors.add(item.user_id)
				topicStats.set(tag, stats)
			}
		}
		const topics = [...topicStats.entries()]
			.filter(([tag, stats]) => isSearchIndexableTopic({
				tag,
				searchAssetCount: stats.count,
				distinctAuthorCount: stats.authors.size,
			}))
			.map(([tag]) => tag)

		return [
			...staticPages,
			...recipes.map((recipe) => ({
				url: `${baseUrl}/recipes/${recipe.id}`,
				lastModified: lastModified(recipe),
				images: uniqueImages(recipe.image_urls, instructionImages.get(recipe.id)),
			})),
			...searchPosts.map((post) => ({
				url: `${baseUrl}/posts/${post.id}`,
				lastModified: lastModified(post),
				images: uniqueImages(post.image_urls),
			})),
			...topics.map((tag) => ({ url: `${baseUrl}${topicHref(tag)}` })),
			...profiles
				.filter((profile) => {
					const counts = activity.get(profile.id) ?? { recipes: 0, posts: 0 }
					return isSearchIndexableProfile(profile, counts.recipes, counts.posts)
				})
				.map((profile) => ({
					url: `${baseUrl}/profile/${profile.public_id}`,
					...(profile.updated_at && { lastModified: new Date(profile.updated_at) }),
				})),
		]
	} catch (error) {
		console.error("❌ Sitemap generation error:", error)
		// ISR 재생성 실패는 기존 목록을 유지한다. 빈 목록으로 정상 캐시를 덮지 않는다.
		throw error
	}
}
