import { mutate } from "swr"
import { cache } from "swr/_internal"

/**
 * 키 앞부분으로 SWR 캐시를 찾아 다시 받거나 고친다.
 *
 * SWR의 일괄 갱신 mutate((key) => ...)는 무한 스크롤 목록(useSWRInfinite)의 키('$inf$…')를 건너뛴다.
 * 그래서 피드·레시피북처럼 무한 스크롤인 목록은 그 방식으로는 다시 받거나 고칠 수 없다.
 * 여기서는 기본 캐시의 키를 직접 훑어, 무한 스크롤 목록은 '$inf$' 키로, 나머지는 그 키 그대로 고른다.
 * (앱은 SWRConfig provider 없이 기본 캐시를 쓴다)
 */
export function cacheKeysMatching(match: (bareKey: string) => boolean): string[] {
	const store = cache as Map<string, unknown>
	const keys: string[] = []
	for (const key of store.keys()) {
		if (key.startsWith("$sub$")) continue
		const infinite = key.startsWith("$inf$")
		const bare = infinite ? key.slice(5) : key
		if (!match(bare)) continue
		// 무한 스크롤의 각 페이지 키(items|0|…)는 목록 키가 모아서 다루므로 건너뛴다
		if (!infinite && store.has(`$inf$${key}`)) continue
		keys.push(key)
	}
	return keys
}

export function cacheKeysStartingWith(prefixes: readonly string[]): string[] {
	return cacheKeysMatching((bare) => prefixes.some((prefix) => bare.startsWith(prefix)))
}

// mutate((key) => …)와 같은 모양으로 쓰되, 무한 스크롤 목록에도 닿는다
export function mutateMatching<T>(match: (key: string) => boolean, data?: T | ((current: never) => unknown), options?: Parameters<typeof mutate>[2]) {
	return Promise.all(cacheKeysMatching(match).map((key) => mutate(key, data as never, options)))
}

// 서버에서 다시 받는다 (화면에 떠 있는 목록만 실제로 요청이 나간다)
export function revalidateStartingWith(prefixes: readonly string[]) {
	return Promise.all(cacheKeysStartingWith(prefixes).map((key) => mutate(key)))
}

// 받은 데이터를 그 자리에서 고친다 (서버에 다시 묻지 않는다)
export function updateStartingWith(prefixes: readonly string[], update: (data: unknown) => unknown) {
	return Promise.all(cacheKeysStartingWith(prefixes).map((key) => mutate(key, update, { revalidate: false })))
}
