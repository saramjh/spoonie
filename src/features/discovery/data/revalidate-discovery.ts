import { revalidatePath } from "next/cache"
import { normalizeTags, topicHref } from "@/shared/lib/topics"

export function revalidateProfilePaths(profileIds: Array<string | null | undefined>) {
	// 작성자 이름·공개 상태는 프로필의 sitemap 포함 여부에도 영향을 준다.
	revalidatePath("/sitemap.xml")
	revalidatePath("/llms.txt")
	for (const profileId of new Set(profileIds.filter((value): value is string => Boolean(value)))) {
		revalidatePath(`/profile/${profileId}`)
	}
}

export function revalidateDiscoveryPaths(args: {
	itemId: string
	profileIds?: Array<string | null | undefined>
	tags?: string[]
}) {
	revalidatePath(`/recipes/${args.itemId}`)
	revalidatePath(`/posts/${args.itemId}`)
	revalidatePath("/")
	revalidatePath("/search")
	revalidatePath("/recipes")

	revalidateProfilePaths(args.profileIds ?? [])
	for (const tag of normalizeTags(args.tags).slice(0, 40)) {
		revalidatePath(topicHref(tag))
	}
}
