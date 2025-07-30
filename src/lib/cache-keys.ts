/**
 * 🎯 통합된 캐시 키 전략
 * 조언받은 내용을 바탕으로 한 일관된 캐시 키 관리
 */

export const CACHE_KEYS = {
  // 포스트 관련 캐시 키
  posts: {
    all: ['posts'] as const,
    lists: () => [...CACHE_KEYS.posts.all, 'list'] as const,
    list: (filters?: Record<string, string | number | boolean>) => [...CACHE_KEYS.posts.lists(), filters] as const,
    details: () => [...CACHE_KEYS.posts.all, 'detail'] as const,
    detail: (id: string) => [...CACHE_KEYS.posts.details(), id] as const,
    likes: (id: string) => [...CACHE_KEYS.posts.all, id, 'likes'] as const,
    comments: (id: string) => [...CACHE_KEYS.posts.all, id, 'comments'] as const,
  },

  // 사용자 관련 캐시 키
  users: {
    all: ['users'] as const,
    profile: (id: string) => [...CACHE_KEYS.users.all, 'profile', id] as const,
    current: () => [...CACHE_KEYS.users.all, 'current'] as const,
  },

  // 아이템 상세 관련
  items: {
    all: ['items'] as const,
    detail: (id: string) => [...CACHE_KEYS.items.all, 'detail', id] as const,
    stats: (id: string) => [...CACHE_KEYS.items.all, 'stats', id] as const,
  },

  // 레시피 관련
  recipes: {
    all: ['recipes'] as const,
    cited: (ids: string[]) => [...CACHE_KEYS.recipes.all, 'cited', ids.sort().join(',')] as const,
  },

  // 좋아요 관련 (통합)
  likes: {
    all: ['likes'] as const,
    byItem: (itemId: string) => [...CACHE_KEYS.likes.all, 'item', itemId] as const,
    byUser: (userId: string) => [...CACHE_KEYS.likes.all, 'user', userId] as const,
    likers: (itemId: string) => [...CACHE_KEYS.likes.all, 'likers', itemId] as const,
  },

  // 댓글 관련
  comments: {
    all: ['comments'] as const,
    byItem: (itemId: string) => [...CACHE_KEYS.comments.all, 'item', itemId] as const,
  },
} as const

/**
 * 🔄 캐시 무효화 헬퍼 함수들
 */
export const CacheInvalidators = {
  // 아이템의 모든 관련 캐시 무효화
  invalidateItem: (itemId: string) => [
    CACHE_KEYS.items.detail(itemId),
    CACHE_KEYS.items.stats(itemId),
    CACHE_KEYS.likes.byItem(itemId),
    CACHE_KEYS.likes.likers(itemId),
    CACHE_KEYS.comments.byItem(itemId),
    CACHE_KEYS.posts.detail(itemId),
    CACHE_KEYS.posts.likes(itemId),
    CACHE_KEYS.posts.comments(itemId),
  ],

  // 포스트 목록 관련 캐시 무효화
  invalidatePostsList: () => [
    CACHE_KEYS.posts.lists(),
    CACHE_KEYS.posts.all,
  ],

  // 좋아요 관련 모든 캐시 무효화
  invalidateLikes: (itemId: string, userId?: string) => [
    CACHE_KEYS.likes.byItem(itemId),
    CACHE_KEYS.likes.likers(itemId),
    ...(userId ? [CACHE_KEYS.likes.byUser(userId)] : []),
  ],
}

/**
 * 🎯 SWR 키 생성 헬퍼
 */
export const createSWRKey = {
  // 기존 문자열 키를 새로운 구조화된 키로 마이그레이션
  itemDetail: (itemId: string) => `item_details_${itemId}`,
  postsList: (userId?: string) => `items|${userId || 'anonymous'}`,
  comments: (itemId: string) => `comments_${itemId}`,
  likers: (itemId: string) => `likers|${itemId}`,
  citedRecipes: (ids: string[]) => `cited-recipes:${ids.sort().join(",")}`,
} 