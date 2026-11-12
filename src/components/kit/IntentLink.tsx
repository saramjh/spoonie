"use client"

import Link, { type LinkProps } from "next/link"
import { forwardRef, type AnchorHTMLAttributes } from "react"
import { useRouter } from "next/navigation"

// 화면에 보이는 모든 피드 링크를 미리 받으면 다수의 Next RSC 요청이 동시에 발생한다.
// 실제 이동 의도가 드러난 링크(hover, touch, keyboard focus) 한 개만 준비한다.
type IntentLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & { href: string }

export const IntentLink = forwardRef<HTMLAnchorElement, IntentLinkProps>(function IntentLink(
	{ href, onPointerEnter, onTouchStart, onFocus, ...props },
	ref
) {
	const router = useRouter()
	const warm = () => router.prefetch(href)
	return (
		<Link
			ref={ref}
			href={href}
			prefetch={false}
			onPointerEnter={(e) => {
				warm()
				onPointerEnter?.(e)
			}}
			onTouchStart={(e) => {
				warm()
				onTouchStart?.(e)
			}}
			onFocus={(e) => {
				warm()
				onFocus?.(e)
			}}
			{...props}
		/>
	)
})
