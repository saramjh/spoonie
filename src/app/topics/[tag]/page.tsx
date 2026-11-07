import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"
import { fetchAllPublicDiscoveryItems, type PublicDiscoveryItem } from "@/features/discovery/data/public-assets"
import { isSearchIndexableTopic, isTopicContributingRecipeed } from "@/features/discovery/domain/search-exposure"
import { normalizeTopicTag, topicHref } from "@/shared/lib/topics"
import { serializeJsonLd } from "@/shared/lib/json-ld"
import { IntentLink, Photo, RelativeTime, StateSheet } from "@/components/kit"

type TopicRow = {
	id: string
	user_id: string
	item_type: "recipe" | "post"
	title: string | null
	description: string | null
	content: string | null
	image_urls: string[] | null
	thumbnail_index: number | null
	servings: number | null
	cooking_time_minutes: number | null
	tags: string[] | null
	cited_recipe_ids: string[] | null
	created_at: string
	profiles: { public_id: string | null; display_name: string | null; username: string | null } | { public_id: string | null; display_name: string | null; username: string | null }[] | null
}

const PAGE_SIZE = 50

function routeTag(value: string): string {
	try {
		return normalizeTopicTag(decodeURIComponent(value))
	} catch {
		return normalizeTopicTag(value)
	}
}

function pageNumber(value: string | string[] | undefined): number {
	const raw = Array.isArray(value) ? value[0] : value
	const parsed = Number.parseInt(raw || "1", 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

const loadTopicAssets = cache(async (tag: string): Promise<PublicDiscoveryItem[]> => {
	if (!tag) return []
	return fetchAllPublicDiscoveryItems({ tag })
})

const loadTopicPage = cache(async (tag: string, page: number, kind: "recipe" | "post") => {
	if (!tag) return [] as TopicRow[]
	const from = (page - 1) * PAGE_SIZE
	const { data, error } = await createSupabasePublicClient()
		.from("items")
		.select("id, user_id, item_type, title, description, content, image_urls, thumbnail_index, servings, cooking_time_minutes, tags, cited_recipe_ids, created_at, profiles!user_id(public_id, display_name, username)")
		.eq("is_public", true)
		.eq("item_type", kind)
		.contains("tags", [tag])
		.order("created_at", { ascending: false })
		.order("id", { ascending: false })
		.range(from, from + PAGE_SIZE - 1)
	if (error) throw error
	return (data ?? []) as unknown as TopicRow[]
})

function topicSearchSignals(tag: string, items: PublicDiscoveryItem[]) {
	const assets = items.filter((item) => item.item_type === "recipe" || isTopicContributingRecipeed(item))
	return {
		tag,
		searchAssetCount: assets.length,
		distinctAuthorCount: new Set(assets.map((item) => item.user_id)).size,
	}
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

type TopicProps = {
	params: Promise<{ tag: string }>
	searchParams?: Promise<{ page?: string | string[]; tab?: string | string[] }>
}

export async function generateMetadata({ params, searchParams }: TopicProps): Promise<Metadata> {
	const { tag: rawTag } = await params
	const tag = routeTag(rawTag)
	const search = await searchParams
	const page = pageNumber(search?.page)
	const tab = (Array.isArray(search?.tab) ? search.tab[0] : search?.tab) === "post" ? "post" : "recipe"
	if (!tag) return { title: "주제 - Spoonie", robots: { index: false, follow: true } }

	try {
		const items = await loadTopicAssets(tag)
		const recipes = items.filter((item) => item.item_type === "recipe").length
		const posts = items.length - recipes
		const indexable = page === 1 && tab === "recipe" && isSearchIndexableTopic(topicSearchSignals(tag, items))
		const description = `${tag}에 관한 공개 레시피 ${recipes}개와 레시피드 ${posts}개를 함께 봅니다. 요리법과 실제 음식·주방 경험을 한 주제에서 연결합니다.`
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
		return {
			title: page === 1 ? `${tag} 요리·레시피 이야기 - Spoonie` : `${tag} 요리·레시피 이야기 ${page}페이지 - Spoonie`,
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
		<div className="mt-3">
			{items.map((item) => {
				const thumb = item.image_urls?.[item.thumbnail_index ?? 0] || item.image_urls?.[0]
				const href = `/${item.item_type === "recipe" ? "recipes" : "posts"}/${item.id}`
				return (
					<IntentLink key={item.id} href={href} className="flex min-h-24 items-center gap-3 border-b border-border py-3">
						<span className="relative aspect-[3/2] w-[105px] flex-none overflow-hidden rounded-lg bg-muted">
							{thumb && <Photo src={thumb} sizes="105px" alt="" />}
						</span>
						<span className="min-w-0 flex-1">
							<span className="block text-label font-semibold text-ink">{itemTitle(item)}</span>
							{item.item_type === "recipe" && (item.servings || item.cooking_time_minutes) && (
								<span className="mt-1 block text-meta text-ink-soft">
									{[item.servings ? String(item.servings) + "인분" : null, item.cooking_time_minutes ? String(item.cooking_time_minutes) + "분" : null].filter(Boolean).join(" · ")}
								</span>
							)}
							<span className="mt-1 block text-meta text-ink-soft">
								{authorName(item)} · <RelativeTime iso={item.created_at} compact />
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

export default async function TopicPage({ params, searchParams }: TopicProps) {
	const { tag: rawTag } = await params
	const tag = routeTag(rawTag)
	const search = await searchParams
	const page = pageNumber(search?.page)
	const tab = (Array.isArray(search?.tab) ? search.tab[0] : search?.tab) === "post" ? "post" : "recipe"
	if (!tag) notFound()

	const [allItems, items] = await Promise.all([loadTopicAssets(tag), loadTopicPage(tag, page, tab)])
	if (allItems.length === 0 || (page > 1 && items.length === 0)) notFound()

	const totalRecipes = allItems.filter((item) => item.item_type === "recipe").length
	const totalPosts = allItems.length - totalRecipes
	const totalSelected = tab === "recipe" ? totalRecipes : totalPosts
	const totalPages = Math.max(1, Math.ceil(totalSelected / PAGE_SIZE))
	const baseTopicHref = topicHref(tag)
	const tabHref = (kind: "recipe" | "post") => kind === "recipe" ? baseTopicHref : baseTopicHref + "?tab=post"
	const pageHref = (next: number) => tabHref(tab) + (next === 1 ? "" : (tab === "recipe" ? "?page=" : "&page=") + next)
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
	const schema = {
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		url: `${baseUrl}${topicHref(tag)}`,
		name: `${tag} 요리·레시피 이야기`,
		about: { "@type": "Thing", name: tag },
		mainEntity: {
			"@type": "ItemList",
			itemListElement: items.map((item, index) => ({
				"@type": "ListItem",
				position: (page - 1) * PAGE_SIZE + index + 1,
				url: `${baseUrl}/${item.item_type === "recipe" ? "recipes" : "posts"}/${item.id}`,
				name: itemTitle(item),
			})),
		},
	}

	return (
		<>
			<section className="mx-auto w-full max-w-[448px] px-4 pb-24 pt-5">
				<h1 className="text-title font-semibold text-ink">#{tag}</h1>
				<p className="mb-5 mt-2 text-label text-ink-soft">같은 주제로 남긴 요리와 이야기</p>
				<nav aria-label="주제별 보기" className="flex border-b border-border bg-paper">
					{(["recipe", "post"] as const).map((kind) => (
						<IntentLink key={kind} href={tabHref(kind)} aria-current={tab === kind ? "page" : undefined}
							className={"-mb-px flex h-12 min-w-0 flex-1 items-center justify-center border-b-2 px-4 text-label font-semibold " + (tab === kind ? "border-primary text-orange-ink" : "border-transparent text-ink-soft")}>
							{kind === "recipe" ? "레시피" : "레시피드"}
						</IntentLink>
					))}
				</nav>
				{items.length > 0 ? (
					<TopicRows items={items} />
				) : (
					<StateSheet title={tab === "recipe" ? "이 주제의 레시피가 없어요" : "이 주제의 레시피드가 없어요"}
						body="다른 종류의 요리 기록도 확인해 보세요." />
				)}
				{totalPages > 1 && (
					<nav className="flex min-h-11 items-center justify-between px-1 text-label" aria-label="주제 페이지 이동">
						{page > 1 ? <IntentLink href={pageHref(page - 1)}>이전</IntentLink> : <span />}
						<span className="text-meta text-ink-soft">{page}/{totalPages}</span>
						{page < totalPages ? <IntentLink href={pageHref(page + 1)}>다음</IntentLink> : <span />}
					</nav>
				)}
			</section>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
		</>
	)
}
