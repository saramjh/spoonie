"use client"

import { useState, useEffect, useCallback } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { User } from "@supabase/supabase-js"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Camera, LogOut, Trash2, ArrowLeft, RefreshCw } from "lucide-react"
import { validateUsername, checkUsernameAvailability, generateUniqueUsername } from "@/lib/username-generator"
import { useSessionStore } from "@/store/sessionStore"

interface Profile {
	username: string | null
	avatar_url: string | null
	profile_message: string | null
	username_changed_count?: number
}

export default function ProfileEditPage() {
	const supabase = createSupabaseBrowserClient()
	const router = useRouter()
	const { toast } = useToast()

	// Zustand store에서 프로필 정보 가져오기 및 업데이트 함수
	const { profile: sessionProfile, setProfile: setSessionProfile } = useSessionStore()

	const [loading, setLoading] = useState(true)
	const [user, setUser] = useState<User | null>(null)
	const [initialProfile, setInitialProfile] = useState<Profile | null>(null)
	const [username, setUsername] = useState("")
	const [profileMessage, setProfileMessage] = useState("")
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
	const [avatarFile, setAvatarFile] = useState<File | null>(null)
	const [isDirty, setIsDirty] = useState(false)
	const [deleteConfirmText, setDeleteConfirmText] = useState("")
	const [usernameError, setUsernameError] = useState("")
	const [canChangeUsername, setCanChangeUsername] = useState(true)
	const [isGenerating, setIsGenerating] = useState(false)

	const handleUsernameValidation = useCallback(
		async (name: string) => {
			const validation = validateUsername(name)
			if (!validation.isValid) {
				setUsernameError(validation.error || "")
				return false
			}

			// 중복 확인
			if (name !== (initialProfile?.username || "")) {
				const isAvailable = await checkUsernameAvailability(name, user?.id)
				if (!isAvailable) {
					setUsernameError("이미 사용 중인 이름입니다.")
					return false
				}
			}

			setUsernameError("")
			return true
		},
		[initialProfile, user]
	)

	const handleGenerateUsername = async () => {
		setIsGenerating(true)
		try {
			const newUsername = await generateUniqueUsername()
			setUsername(newUsername)
		} catch {
			toast({ title: "오류", description: "유저명 생성에 실패했습니다.", variant: "destructive" })
		} finally {
			setIsGenerating(false)
		}
	}

	const fetchProfile = useCallback(
		async (sessionUser: User) => {
			const { data, error } = await supabase.from("profiles").select("username, avatar_url, profile_message, username_changed_count").eq("id", sessionUser.id).single()

			if (error) {
				toast({ title: "오류", description: "프로필 정보를 불러오는데 실패했습니다.", variant: "destructive" })
			} else if (data) {
				const profileData = {
					username: data.username,
					avatar_url: data.avatar_url,
					profile_message: data.profile_message,
					username_changed_count: data.username_changed_count || 0,
				}
				setInitialProfile(profileData)
				setUsername(data.username || "")
				setProfileMessage(data.profile_message || "")
				setAvatarUrl(data.avatar_url)
				setCanChangeUsername((data.username_changed_count || 0) < 1)
			}
			setLoading(false)
		},
		[supabase, toast]
	)

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
			fetchProfile(session.user)
		}
		getUser()
	}, [supabase, router, fetchProfile])

	useEffect(() => {
		if (!initialProfile) return
		const hasChanged = username !== (initialProfile.username || "") || profileMessage !== (initialProfile.profile_message || "") || avatarFile !== null
		setIsDirty(hasChanged)
	}, [username, profileMessage, avatarFile, initialProfile])

	useEffect(() => {
		if (username) {
			handleUsernameValidation(username)
		}
	}, [username, handleUsernameValidation])

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0]
			setAvatarFile(file)
			setAvatarUrl(URL.createObjectURL(file))
		}
	}

	const handleUpdateProfile = async () => {
		if (!user || !isDirty) {
			toast({ title: "오류", description: "변경사항이 없습니다.", variant: "destructive" })
			return
		}

		// 유저명 유효성 검사
		const validation = validateUsername(username)
		if (!validation.isValid) {
			setUsernameError(validation.error || "")
			toast({ title: "오류", description: validation.error || "사용자 이름이 유효하지 않습니다.", variant: "destructive" })
			return
		}

		// 유저명 중복 확인
		const usernameChanged = username !== (initialProfile?.username || "")
		if (usernameChanged) {
			if (!canChangeUsername) {
				toast({ title: "오류", description: "유저명은 1회만 변경 가능합니다.", variant: "destructive" })
				return
			}

			const isAvailable = await checkUsernameAvailability(username, user.id)
			if (!isAvailable) {
				setUsernameError("이미 사용 중인 이름입니다.")
				toast({ title: "오류", description: "이미 사용 중인 이름입니다.", variant: "destructive" })
				return
			}
		}

		setLoading(true)

		let newAvatarUrl = initialProfile?.avatar_url

		if (avatarFile) {
			const filePath = `${user.id}.${avatarFile.name.split(".").pop()}`
			const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatarFile, { upsert: true })
			if (uploadError) {
				toast({ title: "오류", description: "이미지 업로드에 실패했습니다.", variant: "destructive" })
				setLoading(false)
				return
			}
			const {
				data: { publicUrl },
			} = supabase.storage.from("avatars").getPublicUrl(filePath)
			newAvatarUrl = `${publicUrl}?t=${new Date().getTime()}`
		}

		// 업데이트할 데이터 준비
		const updateData = {
			username,
			profile_message: profileMessage,
			avatar_url: newAvatarUrl,
			...(usernameChanged && { username_changed_count: (initialProfile?.username_changed_count || 0) + 1 }),
		}

		const { error: updateError } = await supabase.from("profiles").update(updateData).eq("id", user.id)

		if (updateError) {
			toast({ title: "오류", description: "프로필 업데이트에 실패했습니다.", variant: "destructive" })
		} else {
			// 성공 시 Zustand store도 업데이트
			if (sessionProfile) {
				setSessionProfile({
					...sessionProfile,
					username,
					display_name: sessionProfile.display_name, // 기존 display_name 유지
					avatar_url: newAvatarUrl || null,
				})
			}

			toast({ title: "성공", description: "프로필이 성공적으로 업데이트되었습니다." })
			// Public ID가 있으면 Public ID로, 없으면 UUID로 리다이렉트
			const redirectId = sessionProfile?.public_id || user.id
			router.push(`/profile/${redirectId}`)
		}
		setLoading(false)
	}

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
			body: JSON.stringify({ userId: user.id }),
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

	if (loading && !initialProfile) {
		return <div className="flex justify-center items-center h-screen">로딩 중...</div>
	}

	// 현재 아바타 URL 결정 (로컬 프리뷰 > 세션 스토어 > 초기 프로필)
	const currentAvatarUrl = avatarUrl || sessionProfile?.avatar_url || initialProfile?.avatar_url

	return (
		<div className="p-4 max-w-md mx-auto">
			<header className="flex items-center justify-between mb-8">
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft />
				</Button>
				<h1 className="text-xl font-bold">프로필 수정</h1>
				<Button onClick={handleUpdateProfile} disabled={!isDirty || !!usernameError || loading}>
					{loading ? "저장 중..." : "저장"}
				</Button>
			</header>

			<main>
				<div className="flex flex-col items-center space-y-4 mb-8">
					<div className="relative w-32 h-32">
						<Image src={currentAvatarUrl || "/icon-only.svg"} alt="프로필 이미지" width={128} height={128} className="rounded-full object-cover w-full h-full" />
						<label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full cursor-pointer hover:bg-orange-600">
							<Camera className="w-5 h-5 text-white" />
							<input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
						</label>
					</div>
				</div>

				<div className="space-y-6">
					<div>
						<Label htmlFor="username">사용자 이름</Label>
						
						{/* 입력 필드와 버튼을 함께 감싸는 컨테이너 */}
						<div className="relative">
							<Input 
								id="username" 
								value={username} 
								onChange={(e) => setUsername(e.target.value)} 
								placeholder="한글 10자, 영문 20자 이내" 
								disabled={!canChangeUsername}
								className={canChangeUsername ? "pr-20" : ""} // 버튼 공간 확보
							/>
							{canChangeUsername && (
								<Button 
									type="button" 
									variant="ghost" 
									size="sm" 
									onClick={handleGenerateUsername} 
									disabled={isGenerating} 
									className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 text-xs hover:bg-orange-50 hover:text-orange-600 transition-colors"
								>
									<RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
									생성
								</Button>
							)}
						</div>
						
						{!canChangeUsername ? (
							<p className="text-xs mt-1 text-amber-600">💡 사용자 이름은 1회만 변경 가능합니다. 이미 변경을 완료하셨어요.</p>
						) : usernameError ? (
							<p className="text-xs mt-1 text-red-500">{usernameError}</p>
						) : username && username !== (initialProfile?.username || "") ? (
							<p className="text-xs mt-1 text-orange-600">⚠️ 사용자 이름은 1회만 변경 가능합니다. 신중히 선택해주세요.</p>
						) : (
							<p className="text-xs mt-1 text-gray-500">사용자 이름은 1회만 변경할 수 있어요. 입력 필드의 생성 버튼을 이용해보세요! 🎲</p>
						)}
					</div>
					<div>
						<Label htmlFor="profileMessage">프로필 메시지</Label>
						<Textarea id="profileMessage" value={profileMessage} onChange={(e) => setProfileMessage(e.target.value)} placeholder="자신을 소개해보세요." maxLength={150} className="h-24" />
						<p className="text-right text-xs text-gray-500 mt-1">{profileMessage.length} / 150</p>
					</div>
				</div>

				<hr className="my-8" />

				<div className="space-y-4">
					<h2 className="text-lg font-semibold">계정 관리</h2>
					<Button variant="ghost" className="w-full justify-start text-gray-600" onClick={handleLogout}>
						<LogOut className="w-4 h-4 mr-2" />
						로그아웃
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600">
								<Trash2 className="w-4 h-4 mr-2" />
								회원 탈퇴
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>정말로 탈퇴하시겠어요?</AlertDialogTitle>
								<AlertDialogDescription>회원 탈퇴 시 모든 레시피와 활동 내역이 영구적으로 삭제되며, 복구할 수 없습니다. 계속하시려면 아래에 &apos;탈퇴&apos;라고 입력해주세요.</AlertDialogDescription>
							</AlertDialogHeader>
							<Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="'탈퇴'라고 입력하세요" className="my-4" />
							<AlertDialogFooter>
								<AlertDialogCancel onClick={() => setDeleteConfirmText("")}>취소</AlertDialogCancel>
								<AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirmText !== "탈퇴"} className="bg-red-500 hover:bg-red-600">
									탈퇴하기
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</main>
		</div>
	)
}
