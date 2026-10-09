"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export default function ServiceWorkerUpdater() {
	const { toast } = useToast()

	useEffect(() => {
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			// 메모리 안전: 이벤트 리스너 레퍼런스 저장
			// 새 버전의 서비스워커가 넘겨받으면, 옛 화면이 지워진 파일을 찾지 않도록 새로 연다.
			// - 처음 설치될 때(원래 넘겨받은 워커가 없을 때)는 새로 열지 않는다: 첫 방문자의 화면이 1초 뒤에 다시 열리던 문제
			// - 쓰는 도중에 화면이 바뀌지 않게, 사용자가 이 탭을 떠나 있을 때 새로 연다
			const hadController = !!navigator.serviceWorker.controller
			let reloadPending = false
			const reloadWhenHidden = () => {
				// 작성 폼을 벗어나기 전에는 새 버전이 와도 자동 새로고침하지 않는다.
				// 카메라/사진 선택기를 열 때 hidden 상태로 전환될 수 있다.
				const path = window.location.pathname
				const composing = /^\/(?:recipes|posts)\/new\/?$/.test(path)
					|| /^\/(?:recipes|posts)\/[^/]+\/edit\/?$/.test(path)
				if (reloadPending && !composing && document.visibilityState === 'hidden') window.location.reload()
			}
			const handleControllerChange = () => {
				if (!hadController) return
				reloadPending = true
				reloadWhenHidden()
			}
			document.addEventListener('visibilitychange', reloadWhenHidden)

			const handleStateChange = (newWorker: ServiceWorker) => () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					toast({
						title: "새 버전 사용 가능",
						description: "새로고침하여 최신 버전을 이용하세요.",
						duration: 5000,
					})
				}
			}

			const handleUpdateFound = (registration: ServiceWorkerRegistration) => () => {
				const newWorker = registration.installing
				if (newWorker) {
					const stateChangeHandler = handleStateChange(newWorker)
					newWorker.addEventListener('statechange', stateChangeHandler)
					
					// 메모리 안전: 정리 함수에서 제거할 수 있도록 저장
					return () => {
						newWorker.removeEventListener('statechange', stateChangeHandler)
					}
				}
			}

			// 이벤트 리스너 등록
			navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

			// 업데이트 감지 설정
			let updateFoundCleanup: (() => void) | undefined
			navigator.serviceWorker.ready.then((registration) => {
				const updateFoundHandler = handleUpdateFound(registration)
				registration.addEventListener('updatefound', updateFoundHandler)
				updateFoundCleanup = () => {
					registration.removeEventListener('updatefound', updateFoundHandler)
				}
			})

			// 메모리 안전: cleanup 함수
			return () => {
				navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
				document.removeEventListener('visibilitychange', reloadWhenHidden)
				updateFoundCleanup?.()
			}
		}
	}, [toast])

	// 업데이트 적용
	// const handleUpdate = () => {
	// 	if ('serviceWorker' in navigator) {
	// 		navigator.serviceWorker.ready.then((registration) => {
	// 			if (registration.waiting) {
	// 				registration.waiting.postMessage({ type: 'SKIP_WAITING' })
	// 			}
	// 		})
	// 	}
	// 	setIsUpdateAvailable(false)
	// } // Function not used in current implementation

	return null // UI 없음, 토스트로만 알림
}