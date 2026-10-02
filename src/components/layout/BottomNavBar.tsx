"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Home, Book, Search, Plus, User, Loader2 } from "lucide-react"
import { useSessionStore } from "@/store/sessionStore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CreateOptionsModal from "@/components/layout/CreateOptionsModal"
import { IntentLink } from "@/components/kit"

export default function BottomNavBar() {
	const pathname = usePathname()
	const { session, profile } = useSessionStore()
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

	const handleCreateButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		// 접근성 문제 해결: 모달이 열릴 때 포커스 제거하여 aria-hidden 충돌 방지
		event.currentTarget.blur()
		setIsCreateModalOpen(true)
	}

	const getLinkClass = (href: string, disabled = false) => {
		const isActive = pathname === href || (href.startsWith("/profile") && pathname.startsWith("/profile"))
		let classes = `flex min-w-14 flex-col items-center gap-1 py-1 ${isActive ? "text-ink font-semibold" : "text-ink-soft"}`
		if (disabled) {
			classes += " cursor-not-allowed opacity-50"
		}
		return classes
	}

	const renderMyPageLink = () => {


		// 1. 비로그인 상태
		if (!session) {

			return (
				<Link href="/login" className={getLinkClass("/login")}>
					<User className="w-6 h-6" aria-hidden />
					<span className="text-meta font-medium">로그인</span>
				</Link>
			)
		}

		// 2. 로그인 상태이며 프로필 로드 완료
		if (profile) {
			// public_id가 있으면 사용, 없으면 UUID 사용
			const profileHref = `/profile/${profile.public_id || profile.id}`


			return (
				<IntentLink href={profileHref} aria-label="내 프로필" className="flex min-w-14 flex-col items-center gap-1 py-1">
					<Avatar className="w-7 h-7 ring-2 ring-transparent">
						<AvatarImage src={profile.avatar_url || ""} alt={profile.username || "User"} />
						<AvatarFallback className="text-ink">{profile.username?.charAt(0) || "S"}</AvatarFallback>
					</Avatar>
				</IntentLink>
			)
		}

		// 3. 로그인 상태이나 프로필 로딩 중

		return (
			<div className={getLinkClass("/profile", true)}>
				<div className="w-7 h-7 flex items-center justify-center">
					<Loader2 className="w-6 h-6 animate-spin" />
				</div>
				<span className="text-meta font-medium">로딩중</span>
			</div>
		)
	}

	return (
		<>

			<nav aria-label="주요 메뉴" className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md border-t border-border bg-paper pb-[env(safe-area-inset-bottom)]">
				<div className="flex justify-around items-center h-16">
					{/* 1. 홈 */}
					<Link href="/" className={getLinkClass("/")}>
						<Home className="w-6 h-6" aria-hidden />
						<span className="text-meta font-medium">홈</span>
					</Link>

					{/* 2. 레시피북 */}
					<Link href="/recipes" className={getLinkClass("/recipes")}>
						<Book className="w-6 h-6" aria-hidden />
						<span className="text-meta font-medium">레시피북</span>
					</Link>

					{/* 3. 중앙 생성 버튼 (+) */}
					<button onClick={handleCreateButtonClick} aria-label="새 글 쓰기" className="flex items-center justify-center">
						<span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground active:bg-primary/85">
							<Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
						</span>
					</button>

					{/* 4. 검색 */}
					<Link href="/search" className={getLinkClass("/search")}>
						<Search className="w-6 h-6" aria-hidden />
						<span className="text-meta font-medium">검색</span>
					</Link>

					{/* 5. 로그인/마이페이지 */}
					{renderMyPageLink()}
				</div>
			</nav>

			{/* 작성 선택 모달 */}
			<CreateOptionsModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
		</>
	)
}
