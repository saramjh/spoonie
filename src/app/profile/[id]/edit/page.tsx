"use client"

import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "@/lib/navigation"
import { useToast } from "@/hooks/use-toast"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { LogOut, Trash2 } from "lucide-react"
import TossSeamlessProfileEditor from "@/components/profile/TossSeamlessProfileEditor"
import { PageHeader, SectionHeading, Sheet } from "@/components/kit"
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
		<div className="min-h-screen pb-10">
			<PageHeader title="프로필 수정" />

			<main className="space-y-3 px-3 pt-3">
				<TossSeamlessProfileEditor mode="inline" />

				<Sheet as="section" className="px-4 py-5">
					<SectionHeading>계정</SectionHeading>
					<Button variant="outline" className="mt-3 w-full justify-start" onClick={handleLogout}>
						<LogOut className="h-4 w-4" aria-hidden />
						로그아웃
					</Button>

					{/* 되돌릴 수 없는 동작은 다른 버튼과 떨어뜨려 둔다 */}
					<div className="mt-8 border-t border-border pt-4">
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<button type="button" className="inline-flex h-11 items-center gap-2 text-label text-destructive underline underline-offset-4">
									<Trash2 className="h-4 w-4" aria-hidden />
									회원 탈퇴
								</button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>정말 탈퇴할까요?</AlertDialogTitle>
									<AlertDialogDescription className="text-body text-ink-soft">
										내 레시피, 레시피드, 댓글과 사진이 모두 지워지고 되돌릴 수 없어요. 계속하려면 아래에 &lsquo;탈퇴&rsquo;라고 입력해 주세요.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="탈퇴" aria-label="확인 문구 입력" />
								<AlertDialogFooter className="gap-2">
									<AlertDialogCancel onClick={() => setDeleteConfirmText("")}>취소</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleDeleteAccount}
										disabled={deleteConfirmText !== "탈퇴"}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										탈퇴하기
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</Sheet>
			</main>
		</div>
	)
}
