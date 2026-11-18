"use client"

import Link from "./NavigationLink"
import type { LinkProps } from "next/link"
import { forwardRef, type AnchorHTMLAttributes } from "react"
import { useRouter } from "next/navigation"

// 레시피·레시피드·프로필은 실제 의도(hover, focus, touch)를 보일 때만 준비한다.
// 목록에 렌더된 수십 링크를 미리 요청하면 조회하지 않은 서버 RSC 호출까지 과금될 수 있다.
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
