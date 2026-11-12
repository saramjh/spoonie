"use client"

import Link, { type LinkProps } from "next/link"
import { forwardRef, type AnchorHTMLAttributes } from "react"
import { useRouter } from "next/navigation"

// 실제로 바로 열 가능성이 높은 화면 안의 레시피/레시피드 상세만 미리 준비한다.
// 피드마다 반복되는 프로필은 의도를 보였을 때만 요청해 선제 RSC 트래픽을 줄인다.
const EAGER_DETAIL = /^\/(?:recipes|posts)\/[0-9a-f-]{36}(?:[?#]|$)/i
type IntentLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & { href: string }

export const IntentLink = forwardRef<HTMLAnchorElement, IntentLinkProps>(function IntentLink(
	{ href, onPointerEnter, onTouchStart, onFocus, ...props },
	ref
) {
	const router = useRouter()
	if (EAGER_DETAIL.test(href)) {
		return <Link ref={ref} href={href} onPointerEnter={onPointerEnter} onTouchStart={onTouchStart} onFocus={onFocus} {...props} />
	}
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
