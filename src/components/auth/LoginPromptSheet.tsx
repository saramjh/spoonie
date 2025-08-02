"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import Image from "next/image"

interface LoginPromptSheetProps {
	isOpen: boolean
	onClose: () => void
	action: "follow" | "like" | "bookmark" | "comment" | "notification"
	targetName?: string
}

const ACTION_MESSAGES = {
	follow: {
		title: "팔로우하기",
	},
	like: {
		title: "좋아요 누르기", 
	},
	bookmark: {
		title: "북마크하기",
	},
	comment: {
		title: "댓글 작성하기",
	},
	notification: {
		title: "알림 확인하기",
	},
}

export default function LoginPromptSheet({ 
	isOpen, 
	onClose, 
	action, 
	targetName 
}: LoginPromptSheetProps) {
	const router = useRouter()
	const actionInfo = ACTION_MESSAGES[action]
	const loginButtonRef = useRef<HTMLButtonElement>(null)
	const previousFocusRef = useRef<HTMLElement | null>(null)

	// 🎯 접근성 포커스 관리: aria-hidden 충돌 완전 방지
	useEffect(() => {
		if (isOpen) {
			// 현재 포커스된 요소 저장 및 즉시 블러 처리
			const activeElement = document.activeElement as HTMLElement
			if (activeElement && activeElement.blur) {
				activeElement.blur() // 포커스 즉시 해제
			}
			previousFocusRef.current = activeElement
			
			// 바텀시트 내 첫 번째 버튼으로 포커스 이동
			const focusTimer = setTimeout(() => {
				if (loginButtonRef.current) {
					loginButtonRef.current.focus()
				}
			}, 200)
			
			return () => clearTimeout(focusTimer)
		} else {
			// 🚨 바텀시트 닫힐 때: aria-hidden 해제 완료 후 포커스 복원
			const restoreTimer = setTimeout(() => {
				// aria-hidden 상태 확인 및 안전한 포커스 복원
				const restoreFocus = () => {
					if (previousFocusRef.current && previousFocusRef.current.focus) {
						// 요소가 여전히 DOM에 존재하고 포커스 가능한지 확인
						const isElementVisible = previousFocusRef.current.offsetParent !== null
						const isNotHidden = !previousFocusRef.current.closest('[aria-hidden="true"]')
						
						if (isElementVisible && isNotHidden) {
							try {
								previousFocusRef.current.focus()
							} catch (error) {
								// 포커스 복원 실패 시 조용히 무시
								if (process.env.NODE_ENV === 'development') {
									console.debug('Focus restoration failed:', error)
								}
							}
						}
					}
				}
				
				// 바텀시트 애니메이션 완전 종료 후 포커스 복원 (500ms로 증가)
				restoreFocus()
			}, 500) // 100ms → 500ms로 대폭 증가
			
			return () => clearTimeout(restoreTimer)
		}
	}, [isOpen])

	const handleLogin = () => {
		// 🎯 컨텍스트 유지: 현재 페이지를 기억해두고 로그인 후 돌아오기
		const currentPath = window.location.pathname + window.location.search
		router.push(`/login?returnTo=${encodeURIComponent(currentPath)}`)
		onClose()
	}

	const handleSignup = () => {
		const currentPath = window.location.pathname + window.location.search
		router.push(`/signup?returnTo=${encodeURIComponent(currentPath)}`)
		onClose()
	}

			return (
		<Drawer 
			open={isOpen} 
			onOpenChange={onClose}
			shouldScaleBackground={false} // aria-hidden 충돌 방지
		>
			<DrawerContent 
				className="bg-white focus:outline-none sm:max-w-md sm:mx-auto"
			>
				{/* 🎯 올바른 접근성 구조: DrawerHeader 사용 */}
				<DrawerHeader className="p-6 pb-4">
					<div className="flex items-center gap-3 mb-2">
						<div className="bg-orange-100 p-2 rounded-xl">
							<Image src="/icon-only.svg" alt="Spoonie" width={24} height={24} />
						</div>
						<div>
							<DrawerTitle className="text-lg font-bold text-gray-900 text-left">
								{actionInfo.title}
							</DrawerTitle>
							<DrawerDescription className="text-sm text-gray-600 text-left">
								회원만 이용할 수 있는 기능이에요
							</DrawerDescription>
						</div>
					</div>
				</DrawerHeader>

				{/* 컨텐츠 영역 */}
				<div className="px-6 pb-6">{/* space-y-3 대신 px-6 pb-6 사용 */}

					{/* 토스 스타일 CTA 버튼들 */}
					<div className="space-y-3">
						<Button 
							ref={loginButtonRef}
							onClick={handleLogin}
							className="w-full h-14 text-base font-semibold bg-orange-500 hover:bg-orange-600 rounded-2xl"
						>
							로그인
						</Button>
						
						<Button 
							onClick={handleSignup}
							variant="outline"
							className="w-full h-14 text-base font-medium border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl"
						>
							회원가입
						</Button>
					</div>

					{/* 하단 Safe Area */}
					<div className="h-8" />
				</div>
			</DrawerContent>
		</Drawer>
	)
}