"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"

interface RefreshFunction {
	(): Promise<void>
}

interface ItemUpdateEvent {
	itemId: string
	itemType: "recipe" | "post"
	updateType: "comment_add" | "comment_delete" | "like_add" | "like_remove"
	delta: number // +1 for add, -1 for remove
	userId?: string // 작업을 수행한 사용자 ID
}

interface RefreshContextType {
	isRefreshing: boolean
	refreshFunctions: Map<string, RefreshFunction>
	registerRefreshFunction: (key: string, fn: RefreshFunction) => void
	unregisterRefreshFunction: (key: string) => void
	triggerRefresh: (key?: string) => Promise<void>

	// 새로운 실시간 업데이트 기능
	subscribeToItemUpdates: (callback: (event: ItemUpdateEvent) => void) => () => void
	publishItemUpdate: (event: ItemUpdateEvent) => void
	optimisticUpdate: (itemId: string, updateType: ItemUpdateEvent["updateType"], delta: number) => void
}

const RefreshContext = createContext<RefreshContextType | null>(null)

export function RefreshProvider({ children }: { children: React.ReactNode }) {
	const [isRefreshing, setIsRefreshing] = useState(false)
	const refreshFunctionsRef = useRef<Map<string, RefreshFunction>>(new Map())
	const updateSubscribersRef = useRef<Set<(event: ItemUpdateEvent) => void>>(new Set())
	const pendingUpdatesRef = useRef<Map<string, ItemUpdateEvent>>(new Map())

	const registerRefreshFunction = useCallback((key: string, fn: RefreshFunction) => {
		refreshFunctionsRef.current.set(key, fn)
	}, [])

	const unregisterRefreshFunction = useCallback((key: string) => {
		refreshFunctionsRef.current.delete(key)
	}, [])

	const triggerRefresh = useCallback(async (key?: string) => {
		setIsRefreshing(true)
		try {
			if (key) {
				const fn = refreshFunctionsRef.current.get(key)
				if (fn) {
					await fn()
				}
			} else {
				// 모든 등록된 함수 실행
				const promises = Array.from(refreshFunctionsRef.current.values()).map((fn) => fn())
				await Promise.all(promises)
			}
		} finally {
			setIsRefreshing(false)
		}
	}, [])

	// 실시간 업데이트 구독
	const subscribeToItemUpdates = useCallback((callback: (event: ItemUpdateEvent) => void) => {
		updateSubscribersRef.current.add(callback)

		return () => {
			updateSubscribersRef.current.delete(callback)
		}
	}, [])

	// 아이템 업데이트 이벤트 발행
	const publishItemUpdate = useCallback((event: ItemUpdateEvent) => {
		console.log("🚀 Publishing item update:", event)

		// 중복 업데이트 방지를 위한 키 생성
		const updateKey = `${event.itemId}_${event.updateType}`

		// 펜딩 업데이트가 있다면 누적
		const existingUpdate = pendingUpdatesRef.current.get(updateKey)
		if (existingUpdate) {
			existingUpdate.delta += event.delta
			// delta가 0이 되면 제거
			if (existingUpdate.delta === 0) {
				pendingUpdatesRef.current.delete(updateKey)
				return
			}
		} else {
			pendingUpdatesRef.current.set(updateKey, { ...event })
		}

		// 짧은 딜레이 후 일괄 처리 (debouncing)
		setTimeout(() => {
			const finalUpdate = pendingUpdatesRef.current.get(updateKey)
			if (finalUpdate) {
				updateSubscribersRef.current.forEach((callback) => {
					try {
						callback(finalUpdate)
					} catch (error) {
						console.error("Error in update subscriber:", error)
					}
				})
				pendingUpdatesRef.current.delete(updateKey)
			}
		}, 100) // 100ms 디바운싱
	}, [])

	// 낙관적 업데이트 헬퍼
	const optimisticUpdate = useCallback(
		(itemId: string, updateType: ItemUpdateEvent["updateType"], delta: number) => {
			const itemType = updateType.includes("comment") ? (itemId.includes("recipe") ? "recipe" : "post") : itemId.includes("recipe") ? "recipe" : "post" // 실제로는 더 정확한 판별 로직 필요

			publishItemUpdate({
				itemId,
				itemType: itemType as "recipe" | "post",
				updateType,
				delta,
			})
		},
		[publishItemUpdate]
	)

	const value: RefreshContextType = {
		isRefreshing,
		refreshFunctions: refreshFunctionsRef.current,
		registerRefreshFunction,
		unregisterRefreshFunction,
		triggerRefresh,
		subscribeToItemUpdates,
		publishItemUpdate,
		optimisticUpdate,
	}

	return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
}

export function useRefresh() {
	const context = useContext(RefreshContext)
	if (!context) {
		throw new Error("useRefresh must be used within a RefreshProvider")
	}
	return context
}
