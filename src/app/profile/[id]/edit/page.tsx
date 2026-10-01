"use client"

import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "@/lib/navigation"
import { useToast } from "@/hooks/use-toast"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { LogOut, Trash2, ArrowLeft } from "lucide-react"
import TossSeamlessProfileEditor from "@/components/profile/TossSeamlessProfileEditor"
// useSessionStore removed - using local state instead

export default function ProfileEditPage() {
	const supabase = createSupabaseBrowserClient()
	const router = useRouter()
	const { toast } = useToast()

	const [user, setUser] = useState<User | null>(null)
	const [deleteConfirmText, setDeleteConfirmText] = useState("")

	useEffect(() => {
		const getUser = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (!session) {
				router.push("/login")
				return
			}
			setUser(session.user)
		}
		getUser()
	}, [supabase, router])

	const handleLogout = async () => {
		await supabase.auth.signOut()
		// SPA 라우팅 대신 새로고침을 통한 홈 이동으로 모든 상태 초기화
		window.location.href = "/"
	}

	const handleDeleteAccount = async () => {
		if (!user || deleteConfirmText !== "탈퇴") {
			toast({ title: "오류", description: "정확한 문구를 입력해주세요.", variant: "destructive" })
			return
		}

		const response = await fetch("/api/delete-user", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId: user?.id }),
		})

		if (response.ok) {
			toast({ title: "성공", description: "회원 탈퇴가 완료되었습니다." })
			await supabase.auth.signOut()
			router.push("/")
		} else {
			const { error } = await response.json()
			toast({ title: "오류", description: `회원 탈퇴 중 오류가 발생했습니다: ${error}`, variant: "destructive" })
		}
	}

	return (
		<div className="min-h-screen bg-door">
			{/* 🎨 토스식 헤더 */}
			<header className="bg-paper border-b border-border sticky top-0 z-50">
				<div className="p-4 max-w-md mx-auto">
					<div className="flex items-center justify-between">
						<Button variant="ghost" size="icon" onClick={() => router.back()}>
							<ArrowLeft className="w-5 h-5" />
						</Button>
						<h1 className="text-lg font-bold text-ink">프로필 수정</h1>
						<div className="w-10" /> {/* 스페이서 */}
					</div>
				</div>
			</header>

			{/* 🚀 메인 컨텐츠 영역 */}
			<main className="p-4 max-w-md mx-auto">
				{/* 토스식 프로필 에디터 */}
				<div className="bg-paper rounded-xl shadow-sm border border-border p-6 mb-6">
					<TossSeamlessProfileEditor mode="inline" />
				</div>

				{/* 🔧 계정 관리 섹션 */}
				<div className="bg-paper rounded-xl shadow-sm border border-border p-6">
					<h2 className="text-lg font-semibold text-ink mb-4">계정 관리</h2>
					
					<div className="space-y-3">
						<Button 
							variant="ghost" 
							className="w-full justify-start text-ink-soft hover:bg-door py-3 px-4 rounded-lg" 
							onClick={handleLogout}
						>
							<LogOut className="w-5 h-5 mr-3" />
							로그아웃
						</Button>
						
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button 
									variant="ghost" 
									className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 py-3 px-4 rounded-lg"
								>
									<Trash2 className="w-5 h-5 mr-3" />
									회원 탈퇴
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent className="mx-4">
								<AlertDialogHeader>
									<AlertDialogTitle className="text-center">정말로 탈퇴하시겠어요?</AlertDialogTitle>
									<AlertDialogDescription className="text-center text-sm text-ink-soft leading-relaxed">
										회원 탈퇴 시 모든 레시피와 활동 내역이 영구적으로 삭제되며, 복구할 수 없습니다. 
										<br /><br />
										계속하시려면 아래에 <strong>&apos;탈퇴&apos;</strong>라고 입력해주세요.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<div className="my-4">
									<Input 
										value={deleteConfirmText} 
										onChange={(e) => setDeleteConfirmText(e.target.value)} 
										placeholder="'탈퇴'라고 입력하세요" 
										className="focus:ring-red-500 focus:border-red-500"
									/>
								</div>
								<AlertDialogFooter className="flex space-x-3">
									<AlertDialogCancel 
										onClick={() => setDeleteConfirmText("")}
										className="flex-1"
									>
										취소
									</AlertDialogCancel>
									<AlertDialogAction 
										onClick={handleDeleteAccount} 
										disabled={deleteConfirmText !== "탈퇴"} 
										className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-border"
									>
										탈퇴하기
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</main>
		</div>
	)
}
