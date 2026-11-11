import { expect, it, vi } from "vitest"
import sitemap from "./sitemap"

vi.mock("@/features/discovery/data/public-assets", () => ({
	fetchAllPublicDiscoveryItems: async () => [{
		id: "recipe-1", user_id: "curator-1", item_type: "recipe", created_at: "2026-11-11T00:00:00Z",
		updated_at: null, image_urls: ["https://images.example/food.jpg?auto=compress&fit=crop&w=1280"], tags: [],
	}],
}))
vi.mock("@/shared/infra/supabase-public", () => ({
	createSupabasePublicClient: () => ({
		from: () => {
			const query = {
				select: () => query, in: () => query, not: () => query, order: () => query,
				range: async () => ({ data: [], error: null }),
			}
			return query
		},
	}),
}))

it("escapes image URL query separators for the Next sitemap XML serializer", async () => {
	const data = await sitemap()
	const recipe = data.find(({ url }) => url.endsWith("/recipes/recipe-1"))
	expect(recipe?.images).toEqual(["https://images.example/food.jpg?auto=compress&amp;fit=crop&amp;w=1280"])
	const { resolveSitemap } = await import("next/dist/build/webpack/loaders/metadata/resolve-route-data")
	const xml: string = resolveSitemap(data)
	expect(xml).toContain("<image:loc>https://images.example/food.jpg?auto=compress&amp;fit=crop&amp;w=1280</image:loc>")
	expect(xml).not.toMatch(/<image:loc>[^<]*&(?!amp;|lt;|gt;)/)
})
