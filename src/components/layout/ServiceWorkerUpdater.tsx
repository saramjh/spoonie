"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export default function ServiceWorkerUpdater() {
	// const [isUpdateAvailable, setIsUpdateAvailable] = useState(false) // Only toast notification used
	const { toast } = useToast()

	useEffect(() => {
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			// 서비스 워커 업데이트 감지
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				// 새로운 서비스 워커가 활성화되면 페이지 새로고침
				if (!navigator.serviceWorker.controller?.scriptURL.includes('webpack')) {
					window.location.reload()
				}
			})

			// 업데이트 대기 중인 서비스 워커 감지
			navigator.serviceWorker.ready.then((registration) => {
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing
					if (newWorker) {
						newWorker.addEventListener('statechange', () => {
							if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
								// setIsUpdateAvailable(true) // Only toast notification used
								toast({
									title: "🔄 새 버전 사용 가능",
									description: "새로고침하여 최신 버전을 이용하세요.",
									duration: 5000,
								})
							}
						})
					}
				})
			})
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