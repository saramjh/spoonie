"use client"

import Link, { type LinkProps } from "next/link"
import { forwardRef, type AnchorHTMLAttributes } from "react"
import { useRouter } from "next/navigation"

// 콘텐츠 화면으로 가는 링크. 미리 받기 방식을 목적지에 따라 고른다.
// - 레시피·레시피드 상세: 미리 만든 페이지(CDN)라 보이기만 해도 미리 받는다 (서버 함수 실행 없음, 한 건 약 6KB). 누르면 바로 열린다.
// - 프로필 등 요청마다 서버에서 그리는 화면: 보이기만 해도 받으면 링크 수만큼 서버 함수가 실행되므로,
//   손가락이 닿거나 마우스가 올라가거나 키보드 포커스가 올 때 그 링크 하나만 미리 받는다.
const PREBUILT = /^\/(recipes|posts)\/[0-9a-f-]{36}(?:[?#]|$)/i
type IntentLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & { href: string }

export const IntentLink = forwardRef<HTMLAnchorElement, IntentLinkProps>(function IntentLink(
	{ href, onPointerEnter, onTouchStart, onFocus, ...props },
	ref
) {
	const router = useRouter()
	if (PREBUILT.test(href)) return <Link ref={ref} href={href} onPointerEnter={onPointerEnter} onTouchStart={onTouchStart} onFocus={onFocus} {...props} />
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
