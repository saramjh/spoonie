/**
 * 좋아요·저장의 화면 상태 바꾸기 (순수 함수). unified-cache-manager.ts에서 내용을 바꾸지 않고 옮겨 왔다.
 * "몇 개 더하기"가 아니라 절대 상태로 바꾼다: 이미 그 상태면 아무것도 바꾸지 않는다 (같은 요청이 두 번 와도 숫자가 틀어지지 않는다).
 */

import type { Item } from "@/types/item"

export type Patch = (item: Item) => Partial<Item>

export const setLiked =
	(liked: boolean): Patch =>
	(item) =>
		!!item.is_liked === liked ? {} : { is_liked: liked, likes_count: Math.max(0, (item.likes_count || 0) + (liked ? 1 : -1)) }

export const setBookmarked =
	(bookmarked: boolean): Patch =>
	(item) =>
		!!item.is_bookmarked === bookmarked ? {} : { is_bookmarked: bookmarked, bookmarks_count: Math.max(0, (item.bookmarks_count || 0) + (bookmarked ? 1 : -1)) }

// 팔로워·팔로잉 수 하나를 바꾼다 (0 아래로 내려가지 않게)
export const shiftCount = <T extends Record<string, number>>(counts: T, field: keyof T, by: number): T => ({ ...counts, [field]: Math.max(0, counts[field] + by) })
