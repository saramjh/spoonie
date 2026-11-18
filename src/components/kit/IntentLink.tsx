"use client"

import Link from "./NavigationLink"
import type { LinkProps } from "next/link"
import { forwardRef, type AnchorHTMLAttributes } from "react"
import { useRouter } from "next/navigation"

// 마우스 hover·키보드 focus만 미리 준비한다. 터치 스크롤 시작은 이동 의도가 아니다.
// 목록에 렌더된 수십 링크를 미리 요청하면 조회하지 않은 서버 RSC 호출까지 과금될 수 있다.
type IntentLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & LinkProps & { href: string }

export const IntentLink = forwardRef<HTMLAnchorElement, IntentLinkProps>(function IntentLink(
	{ href, onPointerEnter, onFocus, ...props },
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
				if (e.pointerType === "mouse") warm()
				onPointerEnter?.(e)
			}}
			onFocus={(e) => {
				warm()
				onFocus?.(e)
			}}
			{...props}
		/>
	)
})
