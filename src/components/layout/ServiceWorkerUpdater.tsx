"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export default function ServiceWorkerUpdater() {
	// const [isUpdateAvailable, setIsUpdateAvailable] = useState(false) // Only toast notification used
	const { toast } = useToast()

	useEffect(() => {
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			// 🔧 메모리 안전: 이벤트 리스너 레퍼런스 저장
			const handleControllerChange = () => {
				// 새로운 서비스 워커가 활성화되면 페이지 새로고침
				if (!navigator.serviceWorker.controller?.scriptURL.includes('webpack')) {
					window.location.reload()
				}
			}

			const handleStateChange = (newWorker: ServiceWorker) => () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					toast({
						title: "🔄 새 버전 사용 가능",
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
					
					// 🔧 메모리 안전: 정리 함수에서 제거할 수 있도록 저장
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

			// 🔧 메모리 안전: cleanup 함수
			return () => {
				navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
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