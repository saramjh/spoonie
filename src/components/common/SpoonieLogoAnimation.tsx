"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface SpoonieLogoAnimationProps {
	isLoading?: boolean
	showSlogan?: boolean
	useFullLogo?: boolean
	intro?: boolean
}

export default function SpoonieLogoAnimation({
	isLoading = false,
	showSlogan = false,
	useFullLogo = false,
	intro = false,
}: SpoonieLogoAnimationProps) {
	const logoSrc = useFullLogo ? "/logo-full.svg" : "/icon-only.svg"
	const width = useFullLogo ? 180 : 120
	const height = useFullLogo ? 180 : 120

	const logoContainerClasses = cn("relative", {
		"animate-splash-logo-bounce": intro,
		"animate-pull-to-refresh-jiggle": isLoading && !intro,
	})

	const logoClasses = cn("transition-transform duration-300")

	const sloganClasses = cn("text-2xl font-bold text-gray-600 opacity-0 mt-5", {
		"animate-slogan-fade-in": intro,
	})

	return (
		<div className="flex flex-col items-center justify-center">
			<div className={logoContainerClasses}>
				<div
					className={logoClasses}
					style={{
						filter: isLoading ? "drop-shadow(0 8px 20px rgba(249, 115, 22, 0.35))" : "none",
					}}>
					 <Image 
						src={logoSrc} 
						alt="Spoonie Logo" 
						width={useFullLogo ? 180 : 120} 
						height={useFullLogo ? 57 : 120} 
						priority 
						className="h-auto"
					/> 
				</div>
			</div>
			{showSlogan && <p className={sloganClasses}>요리의 즐거움, 한 스푼</p>}
		</div>
	)
}
