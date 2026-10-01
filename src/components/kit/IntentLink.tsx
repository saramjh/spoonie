"use client"

import Link, { type LinkProps } from "next/link"
import { forwardRef, type AnchorHTMLAttributes } from "react"
import { useRouter } from "next/navigation"

// 상세·프로필처럼 서버에서 새로 그리는 화면으로 가는 링크.
// 화면에 보이기만 해도 미리 받는 기본 동작은 보이는 링크 수만큼 서버 함수를 실행시킨다 (홈 한 번에 16회).
// 대신 손가락이 닿거나 마우스가 올라가거나 키보드 포커스가 올 때 그 링크 하나만 미리 받는다.
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
