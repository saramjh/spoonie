"use client"

import { useRouter } from "@/shared/lib/navigation"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

interface LoginPromptSheetProps {
	isOpen: boolean
	onClose: () => void
	action: "follow" | "like" | "bookmark" | "comment" | "notification"
}

// 어떤 행동이 로그인 후 가능해지는지를 알려준다. 로그인했다고 원래 행동이 자동 실행되지는 않는다.
export const ACTION_MESSAGES = {
  follow: {
    title: "이 사람의 요리를 계속 보고 싶다면",
    body: "팔로우하면 새로 공개한 요리를 ‘팔로우 중’ 피드에서 모아 볼 수 있어요.",
  },
  like: {
    title: "마음에 드는 요리에 공감하기",
    body: "로그인하면 이 글에 좋아요를 남길 수 있어요.",
  },
  bookmark: {
    title: "다음에 볼 요리를 저장해 두세요",
    body: "레시피와 레시피드를 저장해 두면 ‘저장한 글’에서 다시 찾을 수 있어요.",
  },
  comment: {
    title: "요리에 관한 이야기를 나눠 보세요",
    body: "궁금한 점이나 직접 바꿔 만든 경험을 댓글로 남길 수 있어요.",
  },
  notification: {
    title: "내 요리에 관한 소식을 확인하세요",
    body: "내 글에 달린 댓글, 좋아요, 레시피를 참고한 기록을 알림에서 볼 수 있어요.",
  },
} as const

export default function LoginPromptSheet({ 
	isOpen, 
	onClose, 
	action 
}: LoginPromptSheetProps) {
	const router = useRouter()
	const actionInfo = ACTION_MESSAGES[action]
	const loginButtonRef = useRef<HTMLButtonElement>(null)
	const previousFocusRef = useRef<HTMLElement | null>(null)

	// 접근성 포커스 관리: aria-hidden 충돌 완전 방지
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
			// 바텀시트 닫힐 때: aria-hidden 해제 완료 후 포커스 복원
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
				
				// 닫힘 애니메이션이 끝난 뒤 원래 요소에 포커스를 돌린다.
				restoreFocus()
			}, 500) // 100ms → 500ms로 대폭 증가
			
			return () => clearTimeout(restoreTimer)
		}
	}, [isOpen])

	const handleLogin = () => {
		// 컨텍스트 유지: 현재 페이지를 기억해두고 로그인 후 돌아오기
		const currentPath = window.location.pathname + window.location.search
		router.push(`/login?next=${encodeURIComponent(currentPath)}`)
		onClose()
	}

	const handleSignup = () => {
		const currentPath = window.location.pathname + window.location.search
		router.push(`/signup?next=${encodeURIComponent(currentPath)}`)
		onClose()
	}

	return (
		<Drawer 
			open={isOpen} 
			onOpenChange={onClose}
			shouldScaleBackground={false} // aria-hidden 충돌 방지
		>
			<DrawerContent 
				className="focus:outline-none sm:mx-auto sm:max-w-md"
			>
				<DrawerHeader className="px-5 pb-2 pt-5 text-left">
					<DrawerTitle className="text-title text-ink">{actionInfo.title}</DrawerTitle>
					<DrawerDescription className="text-label leading-relaxed text-ink-soft">{actionInfo.body} 로그인 후 현재 화면으로 돌아옵니다.</DrawerDescription>
				</DrawerHeader>
				<div className="space-y-2 px-5 pb-6 pt-3">
					<Button ref={loginButtonRef} onClick={handleLogin} className="h-12 w-full text-body">
						로그인
					</Button>
					<Button onClick={handleSignup} variant="outline" className="h-12 w-full text-body">
						처음이라면 계정 만들기
					</Button>
				</div>
			</DrawerContent>
		</Drawer>
	)
}