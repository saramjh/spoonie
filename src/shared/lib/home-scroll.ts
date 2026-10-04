const HOME_SCROLL_DURATION_MS = 280

export function scrollHomeToTop() {
	const startY = window.scrollY
	if (startY <= 0) return

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		window.scrollTo({ top: 0, left: 0 })
		return
	}

	const startedAt = performance.now()
	const animate = (now: number) => {
		const progress = Math.min((now - startedAt) / HOME_SCROLL_DURATION_MS, 1)
		const eased = 1 - Math.pow(1 - progress, 4)
		window.scrollTo({ top: Math.round(startY * (1 - eased)), left: 0 })
		if (progress < 1) requestAnimationFrame(animate)
	}

	requestAnimationFrame(animate)
}
