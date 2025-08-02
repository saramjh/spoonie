"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Home, Book, Search, Plus, User, Loader2 } from "lucide-react"
import { useSessionStore } from "@/store/sessionStore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CreateOptionsModal from "@/components/layout/CreateOptionsModal"

export default function BottomNavBar() {
	const pathname = usePathname()
	const { session, profile } = useSessionStore()
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [showDebug, setShowDebug] = useState(false)

	const handleCreateButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		// 🔧 접근성 문제 해결: 모달이 열릴 때 포커스 제거하여 aria-hidden 충돌 방지
		event.currentTarget.blur()
		setIsCreateModalOpen(true)
	}

	const getLinkClass = (href: string, disabled = false) => {
		const isActive = pathname === href || (href.startsWith("/profile") && pathname.startsWith("/profile"))
		let classes = `flex flex-col items-center gap-1 ${isActive ? "text-orange-500" : "text-gray-500"}`
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
					<User className="w-6 h-6" />
					<span className="text-xs font-medium">로그인</span>
				</Link>
			)
		}

		// 2. 로그인 상태이며 프로필 로드 완료
		if (profile) {
			// public_id가 있으면 사용, 없으면 UUID 사용
			const profileHref = `/profile/${profile.public_id || profile.id}`


			return (
				<Link href={profileHref} className="flex flex-col items-center gap-1">
					<Avatar className="w-7 h-7 ring-2 ring-transparent hover:ring-orange-200 transition-all">
						<AvatarImage src={profile.avatar_url || ""} alt={profile.username || "User"} />
						<AvatarFallback className="bg-orange-100 text-orange-600">{profile.username?.charAt(0) || "S"}</AvatarFallback>
					</Avatar>
				</Link>
			)
		}

		// 3. 로그인 상태이나 프로필 로딩 중

		return (
			<div className={getLinkClass("/profile", true)}>
				<div className="w-7 h-7 flex items-center justify-center">
					<Loader2 className="w-6 h-6 animate-spin" />
				</div>
				<span className="text-xs font-medium">로딩중</span>
			</div>
		)
	}

	return (
		<>
			{/* 임시 디버깅 패널 */}
			{showDebug && (
				<div className="fixed top-0 left-0 right-0 bg-black text-white text-xs p-2 z-[100] max-w-md mx-auto">
					<div className="flex justify-between items-start">
						<div>
							<div>
								Session: {session ? "✅" : "❌"} {session?.email}
							</div>
							<div>
								Profile: {profile ? "✅" : "❌"} {profile?.username}
							</div>
							<div>Public ID: {profile?.public_id || "null"}</div>
						</div>
						<button onClick={() => setShowDebug(false)} className="text-white">
							✕
						</button>
					</div>
				</div>
			)}

			<nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 max-w-md mx-auto">
				<div className="flex justify-around items-center h-16">
					{/* 1. 홈 */}
					<Link href="/" className={getLinkClass("/")}>
						<Home className="w-6 h-6" />
						<span className="text-xs font-medium">홈</span>
					</Link>

					{/* 2. 레시피북 */}
					<Link href="/recipes" className={getLinkClass("/recipes")}>
						<Book className="w-6 h-6" />
						<span className="text-xs font-medium">레시피북</span>
					</Link>

					{/* 3. 중앙 생성 버튼 (+) */}
					<button onClick={handleCreateButtonClick} onDoubleClick={() => setShowDebug(true)} className="flex flex-col items-center gap-1 text-gray-500 transition-all duration-200 hover:text-orange-500 active:scale-95">
						<div className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl p-3 shadow-bauhaus hover:shadow-bauhaus-lg transition-all duration-200 transform hover:scale-105 active:scale-95">
							<Plus className="w-6 h-6 text-white" />
						</div>
					</button>

					{/* 4. 검색 */}
					<Link href="/search" className={getLinkClass("/search")}>
						<Search className="w-6 h-6" />
						<span className="text-xs font-medium">검색</span>
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
