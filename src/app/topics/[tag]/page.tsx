import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"
import { isSearchIndexableRecipeed, isSearchIndexableTopic } from "@/features/discovery/domain/search-exposure"
import { normalizeTopicTag, topicHref } from "@/shared/lib/topics"
import { serializeJsonLd } from "@/shared/lib/json-ld"
import { IntentLink, PageHeader, Photo, RelativeTime, SectionHeading, Sheet } from "@/components/kit"

type TopicRow = {
	id: string
	user_id: string
	item_type: "recipe" | "post"
	title: string | null
	description: string | null
	content: string | null
	image_urls: string[] | null
	thumbnail_index: number | null
	tags: string[] | null
	cited_recipe_ids: string[] | null
	created_at: string
	profiles: { public_id: string | null; display_name: string | null; username: string | null } | { public_id: string | null; display_name: string | null; username: string | null }[] | null
}

function routeTag(value: string): string {
	try {
		return normalizeTopicTag(decodeURIComponent(value))
	} catch {
		return normalizeTopicTag(value)
	}
}

const loadTopic = cache(async (tag: string) => {
	if (!tag) return [] as TopicRow[]
	const { data, error } = await createSupabasePublicClient()
		.from("items")
		.select("id, user_id, item_type, title, description, content, image_urls, thumbnail_index, tags, cited_recipe_ids, created_at, profiles!user_id(public_id, display_name, username)")
		.eq("is_public", true)
		.contains("tags", [tag])
		.order("created_at", { ascending: false })
		.limit(100)
	if (error) throw error
	return (data ?? []) as unknown as TopicRow[]
})

function topicSearchSignals(tag: string, items: TopicRow[]) {
	const assets = items.filter((item) => item.item_type === "recipe" || isSearchIndexableRecipeed(item))
	return { tag, searchAssetCount: assets.length, distinctAuthorCount: new Set(assets.map((item) => item.user_id)).size }
}

function authorName(item: TopicRow): string {
	const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
	return profile?.display_name || profile?.username || "사용자"
}

function itemTitle(item: TopicRow): string {
	if (item.title?.trim()) return item.title.trim()
	const body = (item.content || item.description || "").replace(/\s+/g, " ").trim()
	return body ? body.slice(0, 48) : item.item_type === "recipe" ? "레시피" : "레시피드"
}

export const revalidate = 600

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
	const { tag: rawTag } = await params
	const tag = routeTag(rawTag)
	if (!tag) return { title: "주제 - Spoonie", robots: { index: false, follow: true } }
	try {
		const items = await loadTopic(tag)
		const recipes = items.filter((item) => item.item_type === "recipe").length
		const posts = items.length - recipes
		const indexable = isSearchIndexableTopic(topicSearchSignals(tag, items))
		const description = `${tag}에 관한 공개 레시피 ${recipes}개와 레시피드 ${posts}개를 함께 봅니다. 요리법과 실제 음식·주방 경험을 한 주제에서 연결합니다.`
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
		return {
			title: `${tag} 요리·레시피 이야기 - Spoonie`,
			description,
			alternates: { canonical: `${baseUrl}${topicHref(tag)}` },
			robots: indexable
				? { index: true, follow: true, googleBot: { "max-image-preview": "large", "max-snippet": -1 } }
				: { index: false, follow: true },
			openGraph: { title: `${tag} - Spoonie`, description, type: "website", siteName: "Spoonie" },
		}
	} catch {
		return { title: `${tag} - Spoonie`, robots: { index: false, follow: true } }
	}
}

function TopicRows({ items }: { items: TopicRow[] }) {
	return (
		<div className="mt-3 divide-y divide-border">
			{items.map((item) => {
				const thumb = item.image_urls?.[item.thumbnail_index ?? 0] || item.image_urls?.[0]
				const href = `/${item.item_type === "recipe" ? "recipes" : "posts"}/${item.id}`
				return (
					<IntentLink key={item.id} href={href} className="flex min-h-24 items-center gap-3 py-3">
						<span className="relative h-20 w-20 flex-none overflow-hidden rounded-[2px] bg-muted">
							{thumb && <Photo src={thumb} sizes="80px" alt="" />}
						</span>
						<span className="min-w-0 flex-1">
							<span className="block text-heading text-ink">{itemTitle(item)}</span>
							<span className="mt-1 block text-meta text-ink-soft">
								{item.item_type === "recipe" ? "레시피" : "레시피드"} · {authorName(item)} · <RelativeTime iso={item.created_at} compact />
							</span>
							{item.item_type === "post" && item.content && (
								<span className="mt-1 line-clamp-2 block text-body text-ink-soft">{item.content}</span>
							)}
						</span>
					</IntentLink>
				)
			})}
		</div>
	)
}

export default async function TopicPage({ params }: { params: Promise<{ tag: string }> }) {
	const { tag: rawTag } = await params
	const tag = routeTag(rawTag)
	if (!tag) notFound()
	const items = await loadTopic(tag)
	if (items.length === 0) notFound()
	const recipes = items.filter((item) => item.item_type === "recipe")
	const posts = items.filter((item) => item.item_type === "post")
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
	const schema = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		url: `${baseUrl}${topicHref(tag)}`,
		name: `${tag} 요리·레시피 이야기`,
		about: { "@type": "Thing", name: tag },
		mainEntity: {
			"@type": "ItemList",
			itemListElement: items.slice(0, 50).map((item, index) => ({
				"@type": "ListItem",
				position: index + 1,
				url: `${baseUrl}/${item.item_type === "recipe" ? "recipes" : "posts"}/${item.id}`,
				name: itemTitle(item),
			})),
		},
	}

	return (
		<>
			<PageHeader title={`#${tag}`} />
			<main className="mx-auto w-full max-w-[448px] space-y-3 px-3 pb-24 pt-3">
				<Sheet pad="md">
					<p className="text-body text-ink">#{tag}에 관한 레시피와 레시피드를 함께 모았습니다.</p>
					<p className="mt-1 text-meta text-ink-soft">레시피는 만드는 방법을, 레시피드는 음식·주방·요리 일상의 실제 기록을 보여 줍니다.</p>
				</Sheet>
				{recipes.length > 0 && <Sheet pad="md"><SectionHeading count={recipes.length}>레시피</SectionHeading><TopicRows items={recipes} /></Sheet>}
				{posts.length > 0 && <Sheet pad="md"><SectionHeading count={posts.length}>레시피드</SectionHeading><TopicRows items={posts} /></Sheet>}
			</main>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
		</>
	)
}
