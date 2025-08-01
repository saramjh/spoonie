"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { usePosts } from "@/hooks/usePosts"
import PostCard from "./PostCard"
import PostCardSkeleton from "./PostCardSkeleton"


import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import type { ServerFeedData } from "@/lib/server-data"

interface ItemListProps {
	/**
	 * 서버에서 미리 로딩된 초기 데이터 (SSR 최적화용)
	 * null인 경우 클라이언트에서 데이터 페칭
	 */
	initialData?: ServerFeedData | null
}

/**
 * 🚀 하이브리드 아이템 리스트 컴포넌트 (SSR + CSR)
 * 레시피(recipe)와 레시피드(post) 모두 포함한 통합 아이템 리스트를 표시합니다
 * 
 * @param initialData - 서버에서 미리 로딩된 데이터 (성능 최적화)
 * @returns 무한 스크롤이 적용된 아이템 리스트 컴포넌트
 */
export default function ItemList({ initialData }: ItemListProps) {
	const { feedItems, isLoading, isError, size, setSize, isReachingEnd, mutate: swrMutate } = usePosts(initialData)
	const observerElem = useRef<HTMLDivElement>(null)

	const supabase = createSupabaseBrowserClient()

	// 사용자 상태 및 가입 유도 모달 관련 상태
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const scrollCountRef = useRef(0) // useRef로 변경하여 리렌더링 방지
	const [showSignupModal, setShowSignupModal] = useState(false)
	const [isAuthLoading, setIsAuthLoading] = useState(true)

	// 사용자 상태 확인
	useEffect(() => {
		const checkUser = async () => {
			setIsAuthLoading(true)
			const {
				data: { user },
			} = await supabase.auth.getUser()
			setCurrentUser(user)
			setIsAuthLoading(false)
		}
		checkUser()
	}, [supabase])

	// 🚀 Optimistic Updates 시스템에서는 복잡한 등록/구독 로직 불필요
	// 모든 상태는 optimisticLikeUpdate, optimisticCommentUpdate에서 즉시 처리됨

	// 뒤로가기 및 페이지 포커스 시 자동 새로고침
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				
				swrMutate()
			}
		}

		const handlePopState = () => {
			
			setTimeout(() => swrMutate(), 100) // 짧은 딜레이로 안정성 확보
		}

		document.addEventListener("visibilitychange", handleVisibilityChange)
		window.addEventListener("popstate", handlePopState)

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			window.removeEventListener("popstate", handlePopState)
		}
	}, [swrMutate])

	const handleObserver = useCallback(
		(entries: IntersectionObserverEntry[]) => {
			const target = entries[0]
			if (target.isIntersecting && !isReachingEnd && !isLoading) {
				setSize(size + 1)

				// 비회원인 경우 스크롤 카운트 증가
				if (!currentUser && !isAuthLoading) {
					scrollCountRef.current += 1
					// 10의 배수마다 모달 표시
					if (scrollCountRef.current % 10 === 0) {
						setShowSignupModal(true)
					}
				}
			}
		},
		[setSize, isReachingEnd, isLoading, size, currentUser, isAuthLoading]
	)

	useEffect(() => {
		const element = observerElem.current
		if (!element) return

		const observer = new IntersectionObserver(handleObserver, { threshold: 1.0 })
		observer.observe(element)

		return () => {
			if (element) {
				observer.unobserve(element)
			}
		}
	}, [handleObserver])

	if (isError) {
		return (
			<div className="p-4 text-center">
				<p className="text-red-500">피드를 불러오는데 실패했습니다.</p>
				<button onClick={() => swrMutate()} className="mt-2 px-4 py-2 bg-orange-500 text-white rounded">
					다시 시도
				</button>
			</div>
		)
	}

	if (isLoading && feedItems.length === 0) {
		return (
			<div className="p-4">
				<div className="space-y-6">
					<PostCardSkeleton />
					<PostCardSkeleton />
					<PostCardSkeleton />
				</div>
			</div>
		)
	}

	if (!isLoading && feedItems.length === 0) {
		return (
			<div className="p-4 text-center">
				<p className="text-gray-500">아직 레시피가 없습니다.</p>
			</div>
		)
	}

	return (
		<>
			<div className="relative">
				<div className="p-4 space-y-6">
					{feedItems.map((item) => (
						<PostCard key={`${item.item_type}-${item.item_id}`} item={item} />
					))}
					{!isReachingEnd && (
						<div ref={observerElem} className="h-1">
							{isLoading && <PostCardSkeleton />}
						</div>
					)}
				</div>
			</div>

			{/* 비회원 가입 유도 모달 */}
			<Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
				<DialogContent className="max-w-sm mx-auto rounded-2xl">
					<DialogHeader>
						<DialogTitle className="text-2xl font-bold text-center text-gray-900">이제 가입해보세요! 🍳</DialogTitle>
						<DialogDescription className="text-center text-gray-600 mt-4 leading-relaxed">
							마음에 드는 레시피들이 많았나요?
							<br />
							Spoonie에 가입하시면:
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<ul className="space-y-3 text-sm text-gray-700">
							<li className="flex items-center gap-3">
								<span className="text-orange-500 font-bold">✓</span>
								좋아요와 댓글로 소통할 수 있어요
							</li>
							<li className="flex items-center gap-3">
								<span className="text-orange-500 font-bold">✓</span>내 레시피를 기록하고 공유할 수 있어요
							</li>
							<li className="flex items-center gap-3">
								<span className="text-orange-500 font-bold">✓</span>
								관심있는 요리사를 팔로우할 수 있어요
							</li>
						</ul>
					</div>
					<div className="flex flex-col gap-3">
						<Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold">
							<Link href="/signup">무료로 가입하기</Link>
						</Button>
						<Button asChild variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-50 py-3 rounded-xl font-semibold">
							<Link href="/login">이미 계정이 있어요</Link>
						</Button>
						<Button variant="ghost" className="w-full text-gray-500 hover:text-gray-700 py-2" onClick={() => setShowSignupModal(false)}>
							나중에 하기
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
