"use client"

import React, { useEffect, useState } from "react"
import SpoonieLogoAnimation from "@/components/common/SpoonieLogoAnimation"

export default function SplashScreen() {
	const [isVisible, setIsVisible] = useState(true)
	const [animationPhase, setAnimationPhase] = useState(0) // 0: enter, 1: morph, 2: exit

	useEffect(() => {
		// Phase 1: Enter animation (scale up)
		const enterTimer = setTimeout(() => {
			setAnimationPhase(1)
		}, 500)

		// Phase 2: Morphing animation
		const morphTimer = setTimeout(() => {
			setAnimationPhase(2)
		}, 2200)

		// Phase 3: Exit animation
		const exitTimer = setTimeout(() => {
			setIsVisible(false)
		}, 2800)

		return () => {
			clearTimeout(enterTimer)
			clearTimeout(morphTimer)
			clearTimeout(exitTimer)
		}
	}, [])

	const getBackgroundClasses = () => {
		const baseClasses = "fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ease-in-out"

		switch (animationPhase) {
			case 0: // Enter: orange background
				return `${baseClasses} bg-orange-50`
			case 1: // Morph: gradient background
				return `${baseClasses} bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200`
			case 2: // Exit: deeper gradient
				return `${baseClasses} bg-gradient-to-tr from-orange-200 via-orange-300 to-orange-100`
			default:
				return baseClasses
		}
	}

	return (
		<div
			className={getBackgroundClasses()}
			style={{
				opacity: isVisible ? 1 : 0,
				transform: isVisible ? "scale(1)" : "scale(1.1)",
				transition: "opacity 500ms ease-out, transform 500ms ease-out",
			}}>
			{/* Morphing circles background effect */}
			<div className="absolute inset-0 overflow-hidden">
				<div
					className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-200/30 rounded-full transition-all duration-1000 ease-in-out"
					style={{
						transform: animationPhase === 1 ? "scale(2) translate(50px, -30px)" : "scale(1)",
						opacity: animationPhase === 2 ? 0 : 0.6,
					}}
				/>
				<div
					className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-orange-300/40 rounded-full transition-all duration-1000 ease-in-out"
					style={{
						transform: animationPhase === 1 ? "scale(1.5) translate(-40px, 20px)" : "scale(1)",
						opacity: animationPhase === 2 ? 0 : 0.5,
					}}
				/>
				<div
					className="absolute top-1/2 right-1/3 w-16 h-16 bg-orange-400/20 rounded-full transition-all duration-700 ease-in-out"
					style={{
						transform: animationPhase === 1 ? "scale(3) translate(-80px, -60px)" : "scale(1)",
						opacity: animationPhase === 2 ? 0 : 0.4,
					}}
				/>
			</div>

			{/* Logo with morphing animation */}
			<div className="relative z-10">
				<SpoonieLogoAnimation intro={true} showSlogan={true} useFullLogo={true} />
			</div>

			{/* Morphing overlay effect for exit */}
			{animationPhase === 2 && <div className="absolute inset-0 bg-white transition-opacity duration-500 ease-out" style={{ opacity: isVisible ? 0 : 0.8 }} />}
		</div>
	)
}
