"use client"

import { useState, type ImgHTMLAttributes } from "react"
import { hasVariants, srcSetFor } from "@/lib/image-variants"
import { cn } from "@/lib/utils"

// Spoonie 사진 한 장: 크기별 버전(srcset) 중 화면에 맞는 것 하나만 받는다 (DESIGN.md Interface Grammar 4).
// 프레임(비율·배경)은 감싸는 쪽이 정하고, 이 부품은 프레임을 채운다. 작은 버전이 없으면 원본으로 되돌아간다.
interface PhotoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
	src: string
	// 화면에서 차지하는 너비 (예: "100vw", "(max-width: 448px) 50vw, 220px", "72px")
	sizes: string
	fit?: "cover" | "contain"
	priority?: boolean
}

export function Photo({ src, sizes, fit = "cover", priority = false, className, alt = "", ...props }: PhotoProps) {
	const [fallback, setFallback] = useState(false)
	const useSet = hasVariants(src) && !fallback
	return (
		// eslint-disable-next-line @next/next/no-img-element -- 이미지 최적화 서버 없이 미리 만든 크기별 버전을 srcset으로 쓴다
		<img
			src={src}
			srcSet={useSet ? srcSetFor(src) : undefined}
			sizes={useSet ? sizes : undefined}
			alt={alt}
			loading={priority ? "eager" : "lazy"}
			decoding="async"
			fetchPriority={priority ? "high" : "auto"}
			onError={() => !fallback && setFallback(true)}
			className={cn("absolute inset-0 h-full w-full", fit === "cover" ? "object-cover" : "object-contain", className)}
			{...props}
		/>
	)
}
