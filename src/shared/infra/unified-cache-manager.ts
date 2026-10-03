/**
 * 화면 캐시를 바꾸는 단일 진입점 (docs/architecture.md 화면 상태).
 *
 * 규칙
 * - 먼저 화면을 바꾸고(낙관적), DB에 쓴다. DB가 실패하면 화면을 되돌리고 오류를 던진다 (부르는 쪽 catch가 안내한다).
 * - 상태는 "몇 개 더하기"가 아니라 "좋아요함 / 안 함" 같은 절대 상태로 바꾼다. 같은 요청이 두 번 와도 숫자가 틀어지지 않는다.
 * - 같은 글·같은 동작은 차례대로 처리한다. 빠르게 눌렀다 취소해도 DB와 화면이 마지막 상태로 맞는다.
 * - 목록은 lib/swr-cache로 고친다 (무한 스크롤 목록인 피드·레시피북에도 닿는다).
 *
 * 글이 들어 있는 캐시 모양: 무한 스크롤 Item[][], 목록 Item[], 탐색 { recipes, made }, 글 하나 itemDetail|id
 */

import { mutate } from "swr"
import { revalidateStartingWith, updateStartingWith } from "@/lib/swr-cache"
import { setBookmarked, setLiked, shiftCount, type Patch } from "@/features/social/domain/social-state"
import { fetchLikeServerState, writeBookmark, writeFollow, writeLike } from "@/features/social/data/social-repository"
import type { Item } from "@/types/item"

// 글 목록을 담는 캐시 키
const LIST_KEY_PREFIXES = ["items|", "recipes||", "search_page|", "bookmarks_", "user_items_", "explore|"]
// 새 글을 맨 위에 끼워 넣는 목록 (홈 피드, 레시피북)
const NEWEST_FIRST_LISTS = ["items|", "recipes||"]

const sameItem = (row: unknown, itemId: string) => {
	const r = row as { id?: string; item_id?: string; item?: { id?: string } } | null
	return !!r && (r.id === itemId || r.item_id === itemId || r.item?.id === itemId)
}

// 캐시 모양과 상관없이 그 글만 고친다
function mapItem(data: unknown, itemId: string, patch: Patch): unknown {
	const fix = (row: unknown) => {
		if (!sameItem(row, itemId)) return row
		const record = row as { item?: Item }
		// 탐색의 "만들어 본 기록"처럼 { item, … }로 감싼 줄
		if (record.item && sameItem(record.item, itemId) && !(row as Item).item_type) return { ...record, item: { ...record.item, ...patch(record.item) } }
		return { ...(row as Item), ...patch(row as Item) }
	}
	if (Array.isArray(data)) return data.map((page) => (Array.isArray(page) ? page.map(fix) : fix(page)))
	if (data && typeof data === "object" && "recipes" in data && "made" in data) {
		const explore = data as { recipes: unknown[]; made: unknown[] }
		return { ...explore, recipes: explore.recipes.map(fix), made: explore.made.map(fix) }
	}
	return data
}

// 목록과 글 하나 캐시를 함께 고친다. 글 하나 캐시가 아직 없으면 seed(부르는 쪽이 가진 글)로 시작한다
async function patchItem(itemId: string, patch: Patch, seed?: Partial<Item>) {
	await updateStartingWith(LIST_KEY_PREFIXES, (data) => mapItem(data, itemId, patch))
	await mutate(
		`itemDetail|${itemId}`,
		(current: Item | undefined) => {
			const base = current ?? (seed && "id" in seed ? (seed as Item) : undefined)
			return base ? { ...base, ...patch(base) } : current
		},
		{ revalidate: false }
	)
}

// 같은 키의 작업을 차례대로 (앞 작업이 실패해도 다음 작업은 진행)
const queues = new Map<string, Promise<unknown>>()
function inOrder<T>(key: string, task: () => Promise<T>): Promise<T> {
	const previous = queues.get(key) ?? Promise.resolve()
	const next = previous.catch(() => undefined).then(task)
	queues.set(
		key,
		next.finally(() => {
			if (queues.get(key) === next) queues.delete(key)
		})
	)
	return next
}

const changeFollowCounts = (userId: string, field: "followers" | "following", by: number) =>
	mutate(
		`follow_counts_${userId}`,
		(current: { followers: number; following: number } | undefined) => (current ? shiftCount(current, field, by) : current),
		{ revalidate: false }
	)

export const cacheManager = {
	/** 좋아요 / 취소. DB가 실패하면 화면을 되돌리고 던진다. 3초 뒤 서버 값으로 한 번 더 맞춘다 */
	like: (itemId: string, userId: string, liked: boolean, seed?: Partial<Item>) =>
		inOrder(`like|${itemId}`, async () => {
			await patchItem(itemId, setLiked(liked), seed)
			const { error } = await writeLike(itemId, userId, liked)
			if (error) {
				await patchItem(itemId, setLiked(!liked))
				throw error
			}
			setTimeout(() => void syncLikesFromServer(itemId, userId), 3000)
		}),

	/** 저장 / 취소. DB가 실패하면 화면을 되돌리고 던진다 */
	bookmark: (itemId: string, userId: string, bookmarked: boolean, seed?: Partial<Item>) =>
		inOrder(`bookmark|${itemId}`, async () => {
			await patchItem(itemId, setBookmarked(bookmarked), seed)
			const { error } = await writeBookmark(itemId, userId, bookmarked)
			if (error) {
				await patchItem(itemId, setBookmarked(!bookmarked))
				throw error
			}
		}),

	/** 댓글 수만 바꾼다 (댓글 DB 쓰기는 부르는 쪽). 되돌리는 함수를 돌려준다 */
	comment: async (itemId: string, _userId: string, delta: number, seed?: Partial<Item>) => {
		const by = (d: number): Patch => (item) => ({ comments_count: Math.max(0, (item.comments_count || 0) + d) })
		await patchItem(itemId, by(delta), seed)
		return () => {
			void patchItem(itemId, by(-delta))
		}
	},

	/** 팔로우 / 취소: 팔로워·팔로잉 수를 바로 바꾸고 DB에 쓴다. 실패하면 되돌리고 던진다 */
	follow: (currentUserId: string, targetUserId: string, isFollow: boolean) =>
		inOrder(`follow|${targetUserId}`, async () => {
			const by = isFollow ? 1 : -1
			await Promise.all([changeFollowCounts(targetUserId, "followers", by), changeFollowCounts(currentUserId, "following", by)])
			const { error } = await writeFollow(currentUserId, targetUserId, isFollow)
			if (error) {
				await Promise.all([changeFollowCounts(targetUserId, "followers", -by), changeFollowCounts(currentUserId, "following", -by)])
				throw error
			}
			// "모두의 레시피"는 팔로우한 사람의 레시피라 내용이 바뀐다. 비우지 않고 다시 받기만 한다
			void revalidateStartingWith(["recipes||all_recipes"])
		}),

	/** 글 내용을 고친 뒤(수정·대표 사진) 화면 캐시에 바로 반영. 새 값에 사진이 없으면 있던 사진을 지킨다 */
	updateItem: async (itemId: string, data: Partial<Item>) => {
		await patchItem(
			itemId,
			(item) => (item.image_urls?.length && !data.image_urls?.length ? { ...data, image_urls: item.image_urls } : data),
			{ ...data, id: itemId }
		)
	},

	/** 새 글을 홈 피드와 레시피북 맨 위에 바로 끼워 넣는다 */
	addNewItem: async (newItem: Item) => {
		const itemId = newItem.id || newItem.item_id
		await updateStartingWith(NEWEST_FIRST_LISTS, (data) => {
			if (!Array.isArray(data)) return data
			if (data.length === 0) return [[newItem]]
			if (!Array.isArray(data[0])) return data
			return [[newItem, ...(data[0] as Item[])], ...data.slice(1)]
		})
		await mutate(`itemDetail|${itemId}`, newItem, { revalidate: false })
	},

	/**
	 * 글 지우기: 화면의 모든 목록·상세 캐시에서 바로 뺀다 (DB 삭제 전에 부른다).
	 * 실패하면 돌려받은 함수를 불러 목록을 서버에서 다시 받는다 (지운 줄 알았던 글이 돌아온다).
	 */
	deleteItems: async (itemIds: string[]) => {
		const gone = (row: unknown) => itemIds.some((id) => sameItem(row, id))
		const prune = (data: unknown): unknown => {
			if (Array.isArray(data)) return data.map((page) => (Array.isArray(page) ? page.filter((row) => !gone(row)) : page)).filter((row) => Array.isArray(row) || !gone(row))
			if (data && typeof data === "object" && "recipes" in data && "made" in data) {
				const explore = data as { recipes: unknown[]; made: unknown[] }
				return { ...explore, recipes: explore.recipes.filter((row) => !gone(row)), made: explore.made.filter((row) => !gone(row)) }
			}
			return data
		}
		await updateStartingWith(LIST_KEY_PREFIXES, prune)
		await Promise.all(itemIds.map((id) => mutate(`itemDetail|${id}`, undefined, { revalidate: false })))
		return () => {
			void revalidateStartingWith(LIST_KEY_PREFIXES)
		}
	},

	/** 홈 피드를 서버에서 다시 받는다 */
	revalidateHomeFeed: async () => {
		await revalidateStartingWith(["items|"])
	},
}

// 좋아요 수와 내가 눌렀는지를 서버 값으로 덮는다 (몇 번 실행돼도 결과가 같다)
async function syncLikesFromServer(itemId: string, userId: string) {
	const state = await fetchLikeServerState(itemId, userId)
	if (!state) return
	await patchItem(itemId, () => state)
}
