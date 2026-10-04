import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"

export type PublicDiscoveryItem = {
	id: string
	user_id: string
	item_type: "recipe" | "post"
	created_at: string
	updated_at: string | null
	title: string | null
	description: string | null
	content: string | null
	image_urls: string[] | null
	thumbnail_index: number | null
	tags: string[] | null
	cited_recipe_ids: string[] | null
}

const PAGE_SIZE = 500
const COLUMNS = "id, user_id, item_type, created_at, updated_at, title, description, content, image_urls, thumbnail_index, tags, cited_recipe_ids"

export async function fetchAllPublicDiscoveryItems(
	filters: { itemType?: "recipe" | "post"; tag?: string; userId?: string } = {},
	supabase: SupabaseClient = createSupabasePublicClient()
): Promise<PublicDiscoveryItem[]> {
	const rows: PublicDiscoveryItem[] = []
	for (let from = 0; ; from += PAGE_SIZE) {
		let query = supabase
			.from("items")
			.select(COLUMNS)
			.eq("is_public", true)
			.order("created_at", { ascending: false })
			.range(from, from + PAGE_SIZE - 1)

		if (filters.itemType) query = query.eq("item_type", filters.itemType)
		if (filters.tag) query = query.contains("tags", [filters.tag])
		if (filters.userId) query = query.eq("user_id", filters.userId)

		const { data, error } = await query
		if (error) throw error
		const batch = (data ?? []) as unknown as PublicDiscoveryItem[]
		rows.push(...batch)
		if (batch.length < PAGE_SIZE) break
	}
	return rows
}
