/**
 * 앱(PWA) 설치 경로를 브라우저마다 고른다.
 *
 * 삼성 인터넷은 설치할 때 자체적으로 만든 옛 안드로이드 기준 앱 껍데기를 써서,
 * Google Play 프로텍트가 "안전하지 않은 앱 차단됨"을 띄운다 (Spoonie 코드로는 고칠 수 없다).
 * 크롬은 Google이 만든 껍데기를 써서 이 경고가 없다. 그래서 삼성 인터넷에서는 크롬으로 넘겨 설치하게 한다.
 */

export type InstallPath = "installed" | "prompt" | "open-in-chrome" | "ios" | "browser-menu"

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

// 크롬·엣지가 "설치할 수 있음"을 알려 주면 잡아 둔다 (설정 화면의 설치 버튼이 쓴다). 앱 시작 때 한 번 부른다
export function captureInstallPrompt() {
	if (typeof window === "undefined") return
	window.addEventListener("beforeinstallprompt", (e) => {
		if (isSamsungInternet()) return // 삼성 인터넷의 설치는 경고로 이어지므로 잡지 않는다
		e.preventDefault()
		deferred = e as InstallPromptEvent
		listeners.forEach((fn) => fn())
	})
	window.addEventListener("appinstalled", () => {
		deferred = null
		listeners.forEach((fn) => fn())
	})
}

export function onInstallChange(fn: () => void) {
	listeners.add(fn)
	return () => {
		listeners.delete(fn)
	}
}

export const isSamsungInternet = () => typeof navigator !== "undefined" && /SamsungBrowser/i.test(navigator.userAgent)
const isAndroid = () => /Android/i.test(navigator.userAgent)
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
	typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

export function installPath(): InstallPath {
	if (isStandalone()) return "installed"
	if (isSamsungInternet() && isAndroid()) return "open-in-chrome"
	if (deferred) return "prompt"
	if (isIOS()) return "ios"
	return "browser-menu"
}

export async function promptInstall(): Promise<boolean> {
	if (!deferred) return false
	await deferred.prompt()
	const { outcome } = await deferred.userChoice
	deferred = null
	listeners.forEach((fn) => fn())
	return outcome === "accepted"
}

// 같은 주소를 크롬으로 연다. 크롬이 없으면 플레이 스토어의 크롬 페이지로 간다
export function chromeIntentUrl(): string {
	const { host, pathname, search } = window.location
	const fallback = encodeURIComponent("https://play.google.com/store/apps/details?id=com.android.chrome")
	return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`
}
