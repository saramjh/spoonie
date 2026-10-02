"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "@/lib/navigation"
import { useToast } from "@/hooks/use-toast"
import { User } from "@supabase/supabase-js"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Camera, Loader2, RefreshCw, CheckCircle } from "lucide-react"
import { validateUsername, checkUsernameAvailability, generateUniqueUsername } from "@/lib/username-generator"
import { useSessionStore } from "@/store/sessionStore"
import { optimizeImages } from "@/lib/image-utils"
import { PageHeader, PageLoading, Sheet } from "@/components/kit"
import { revalidateMyProfilePage } from "@/lib/revalidate-item"

interface Profile {
  username: string | null
  avatar_url: string | null
  profile_message: string | null
  username_changed_count?: number
}

interface ProfileEditorProps {
  mode?: 'full' | 'inline' | 'modal'
  onSaveComplete?: () => void
}

export default function ProfileEditor({ 
  mode = 'full',
  onSaveComplete 
}: ProfileEditorProps) {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const { toast } = useToast()

  // Zustand store에서 프로필 정보 가져오기
  const { profile: sessionProfile, setProfile: setSessionProfile } = useSessionStore()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [initialProfile, setInitialProfile] = useState<Profile | null>(null)
  
  // 토스식 상태 관리 - 즉시 반응형
  const [formData, setFormData] = useState({
    username: "",
    profileMessage: "",
    avatarUrl: null as string | null,
    avatarFile: null as File | null
  })
  
  // 실시간 검증 상태
  const [validation, setValidation] = useState({
    username: { isValid: true, error: "", isChecking: false },
    canChangeUsername: true,
    isGenerating: false
  })
  
  // Seamless sync를 위한 optimistic update 추적
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())
  const updateSeq = useRef(0)


  /**
   * Seamless 유저명 검증 (Optimistic + Debounced)
   */
  const validateUsernameSeamless = useCallback(
    async (username: string) => {
      if (!username || username === initialProfile?.username) {
        setValidation(prev => ({ ...prev, username: { isValid: true, error: "", isChecking: false } }))
        return true
      }

      setValidation(prev => ({ ...prev, username: { ...prev.username, isChecking: true } }))

      // 클라이언트 사이드 검증 (즉시)
      const clientValidation = validateUsername(username)
      if (!clientValidation.isValid) {
        setValidation(prev => ({ 
          ...prev, 
          username: { isValid: false, error: clientValidation.error || "", isChecking: false } 
        }))
        return false
      }

      // 서버 사이드 검증 (디바운스)
      try {
        const isAvailable = await checkUsernameAvailability(username, user?.id)
        const result = isAvailable
        
        setValidation(prev => ({ 
          ...prev, 
          username: { 
            isValid: result, 
            error: result ? "" : "이미 사용 중인 이름입니다.", 
            isChecking: false 
          } 
        }))
        
        return result
      } catch {
        setValidation(prev => ({ 
          ...prev, 
          username: { isValid: false, error: "확인 중 오류가 발생했습니다.", isChecking: false } 
        }))
        return false
      }
    },
    [initialProfile, user]
  )

  /**
   * 토스식 스마트 유저명 생성
   */
  const generateSmartUsername = async () => {
    setValidation(prev => ({ ...prev, isGenerating: true }))
    
    try {
      const newUsername = await generateUniqueUsername()
      setFormData(prev => ({ ...prev, username: newUsername }))
      
      // 햅틱 피드백
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      
    } catch {
      toast({ 
        title: "생성 실패", 
        description: "유저명 생성에 실패했습니다. 다시 시도해주세요.", 
        variant: "destructive" 
      })
    } finally {
      setValidation(prev => ({ ...prev, isGenerating: false }))
    }
  }

  /**
   * Seamless 아바타 업로드 (즉시 미리보기)
   */
  const handleAvatarUpload = useCallback((file: File) => {
    // 즉시 로컬 미리보기
    const previewUrl = URL.createObjectURL(file)
    setFormData(prev => ({ 
      ...prev, 
      avatarFile: file, 
      avatarUrl: previewUrl 
    }))
    
    // 햅틱 피드백
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50])
    }
  }, [])

  /**
   * Optimistic Profile Update (0ms 응답)
   */
  const handleOptimisticSave = async () => {
    if (!user) return

    const updateId = `profile_update_${++updateSeq.current}`
    setOptimisticUpdates(prev => new Set(prev).add(updateId))

    try {
      // STEP 1: 즉시 SessionStore 업데이트 (0ms)
      if (sessionProfile) {
        const optimisticProfile = {
          ...sessionProfile,
          username: formData.username,
          avatar_url: formData.avatarUrl
        }
        setSessionProfile(optimisticProfile)
      }

      // STEP 2: 실제 DB 업데이트 (화면의 내 이름·사진은 위에서 세션에 먼저 반영했다)
      await performActualProfileUpdate()
      revalidateMyProfilePage() // 미리 만든 프로필 페이지를 바뀐 내용으로 바로 갱신

      // 성공 시 optimistic update 확정
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateId)
        return newSet
      })

      // 토스식 성공 피드백
      toast({
        title: "프로필을 저장했습니다",
        description: "변경사항이 즉시 반영되었어요",
      })

      if (onSaveComplete) {
        onSaveComplete()
      } else {
        router.push(`/profile/${sessionProfile?.public_id || user.id}`)
      }

    } catch (error) {
      console.error('Profile save failed:', error)
      
      // Session Store 롤백
      if (sessionProfile && initialProfile) {
        setSessionProfile({
          ...sessionProfile,
          username: initialProfile.username || sessionProfile.username,
          avatar_url: initialProfile.avatar_url || sessionProfile.avatar_url
        })
      }

      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateId)
        return newSet
      })

      // 더 자세한 에러 메시지 제공
      let errorMessage = "프로필 저장에 실패했습니다."
      
      if (error instanceof Error) {
        if (error.message.includes('duplicate')) {
          errorMessage = "이미 사용 중인 유저명입니다."
        } else if (error.message.includes('avatar') || error.message.includes('storage')) {
          errorMessage = "이미지 업로드에 실패했습니다."
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "네트워크 연결을 확인해주세요."
        } else {
          errorMessage = `저장 실패: ${error.message}`
        }
      }

      toast({
        title: "저장 실패",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  /**
   * 실제 DB 업데이트 수행
   */
  const performActualProfileUpdate = async () => {
    if (!user) throw new Error('User not found')



    let finalAvatarUrl = initialProfile?.avatar_url // 기본값을 기존 아바타로 설정

    // 아바타 파일 업로드
    if (formData.avatarFile) {
      // 프로필 사진은 36~80px로 보이므로 320px JPEG로 줄여 올린다
      const [resized] = await optimizeImages([formData.avatarFile], 320, 0.85)
      const filePath = `${user.id}.jpg`
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resized.file, { upsert: true, contentType: "image/jpeg" })
      
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)
      
      finalAvatarUrl = `${publicUrl}?t=${new Date().getTime()}`
    }

    // 유저명 변경 여부 확인
    const usernameChanged = formData.username !== (initialProfile?.username || "")

    // 프로필 업데이트 데이터 준비
    const updateData: Record<string, string | number | null> = {
      username: formData.username,
      profile_message: formData.profileMessage,
      avatar_url: finalAvatarUrl || null,
    }

    // 유저명이 변경된 경우에만 카운트 증가
    if (usernameChanged) {
      updateData.username_changed_count = (initialProfile?.username_changed_count || 0) + 1
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)

    if (error) throw error
  }

  // 유저명 변경 시 실시간 검증
  useEffect(() => {
    if (formData.username) {
      const timeoutId = setTimeout(() => {
        validateUsernameSeamless(formData.username)
      }, 300) // 300ms 디바운스

      return () => clearTimeout(timeoutId)
    }
  }, [formData.username, validateUsernameSeamless])

  // 초기 데이터 로드
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          toast({ 
            title: "인증 오류", 
            description: "로그인 세션을 확인할 수 없습니다.", 
            variant: "destructive" 
          })
          router.push("/login")
          return
        }

        if (!session?.user) {
          router.push("/login")
          return
        }

        setUser(session.user)

        const { data, error } = await supabase
          .from("profiles")
          .select("username, avatar_url, profile_message, username_changed_count")
          .eq("id", session.user.id)
          .single()

        if (error) {
          // 프로필이 존재하지 않는 경우 기본값으로 초기화
          if (error.code === 'PGRST116') {
            const defaultProfile = {
              username: '',
              avatar_url: null,
              profile_message: '',
              username_changed_count: 0
            }
            setInitialProfile(defaultProfile)
            setFormData({
              username: "",
              profileMessage: "",
              avatarUrl: null,
              avatarFile: null
            })
            setValidation(prev => ({
              ...prev,
              canChangeUsername: true
            }))
          } else {
            toast({ 
              title: "오류", 
              description: "프로필 정보를 불러오는데 실패했습니다. 새로고침 후 다시 시도해주세요.", 
              variant: "destructive" 
            })
          }
        } else if (data) {
          setInitialProfile(data)
          setFormData({
            username: data.username || "",
            profileMessage: data.profile_message || "",
            avatarUrl: data.avatar_url,
            avatarFile: null
          })
          setValidation(prev => ({
            ...prev,
            canChangeUsername: (data.username_changed_count || 0) < 1
          }))
        }
      } catch (error) {
        console.error('Profile initialization error:', error)
        toast({ 
          title: "시스템 오류", 
          description: "예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.", 
          variant: "destructive" 
        })
      } finally {
        setLoading(false)
      }
    }

    initializeProfile()
  }, [supabase, router, toast])

  // 변경사항 여부 확인
  const hasChanges = 
    formData.username !== (initialProfile?.username || "") ||
    formData.profileMessage !== (initialProfile?.profile_message || "") ||
    formData.avatarFile !== null

  const canSave = hasChanges && 
    validation.username.isValid && 
    !validation.username.isChecking &&
    formData.username.trim() !== "" // 유저명이 비어있지 않아야 함

  if (loading) {
    return (
      <PageLoading />
    )
  }

  // 사진이 없으면 다른 화면과 같이 이름 첫 글자 원 (로고를 기본 사진으로 쓰지 않는다)
  const currentAvatarUrl = formData.avatarUrl || sessionProfile?.avatar_url || null

  const usernameChanged = formData.username !== (initialProfile?.username || "")
  // 프로필 편집: 사진, 이름, 소개 세 가지만. 미리보기·변경 요약 카드는 화면의 값이 곧 결과라 두지 않는다
  return (
    <div className={mode === "full" ? "min-h-screen pb-28" : ""}>
      {mode === "full" && (
        <PageHeader title="프로필 수정" />
      )}

      <main className={mode === "full" ? "px-3 pt-3" : ""}>
        <Sheet className="space-y-6 px-4 pb-6 pt-6">
          <div className="flex items-center gap-4">
            <div className="relative h-[88px] w-[88px] flex-shrink-0 overflow-hidden rounded-full bg-border">
              {currentAvatarUrl ? (
                <Image src={currentAvatarUrl} alt="" width={88} height={88} priority className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-title text-ink-soft" aria-hidden>{(formData.username || sessionProfile?.username || "?").charAt(0)}</span>
              )}
            </div>
            <div>
              <label htmlFor="avatar-upload" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-ink/20 px-4 text-label font-medium text-ink transition-colors hover:border-ink/35 hover:bg-muted">
                <Camera className="h-4 w-4" aria-hidden />
                사진 바꾸기
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
              {formData.avatarFile && <p className="mt-1 text-meta text-ink-soft">저장하면 바뀌어요</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="username" className="text-label font-medium text-ink">
              이름
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="한글 10자, 영문 20자 이내"
                disabled={!validation.canChangeUsername}
                aria-invalid={!!validation.username.error}
                aria-describedby="username-help"
                className={`h-12 pr-24 ${validation.username.error ? "border-destructive" : ""}`}
              />
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
                {validation.username.isChecking && <Loader2 className="mr-1 h-4 w-4 animate-spin text-ink-soft" aria-label="확인 중" />}
                {!validation.username.isChecking && validation.username.isValid && usernameChanged && (
                  <CheckCircle className="mr-1 h-4 w-4 text-ink" aria-label="쓸 수 있는 이름" />
                )}
                {validation.canChangeUsername && (
                  <Button type="button" variant="ghost" onClick={generateSmartUsername} disabled={validation.isGenerating} className="h-10 px-2 text-label">
                    <RefreshCw className={`h-4 w-4 ${validation.isGenerating ? "animate-spin" : ""}`} aria-hidden />
                    추천
                  </Button>
                )}
              </div>
            </div>
            <p id="username-help" className={`mt-1.5 text-meta ${validation.username.error ? "text-destructive" : "text-ink-soft"}`}>
              {!validation.canChangeUsername
                ? "이름은 한 번만 바꿀 수 있어서 이미 바꾼 이름을 쓰고 있어요."
                : validation.username.error
                  ? validation.username.error
                  : "이름은 한 번만 바꿀 수 있어요. 마음에 드는 이름이 없으면 추천을 눌러 보세요."}
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="profileMessage" className="text-label font-medium text-ink">
                소개
              </Label>
              <span className={`text-meta tabular-nums ${formData.profileMessage.length > 130 ? "text-ink" : "text-ink-soft"}`}>
                {formData.profileMessage.length}/150
              </span>
            </div>
            <Textarea
              id="profileMessage"
              value={formData.profileMessage}
              onChange={(e) => setFormData((prev) => ({ ...prev, profileMessage: e.target.value }))}
              placeholder="어떤 요리를 주로 하는지 적어 보세요"
              maxLength={150}
              className="mt-1.5 h-28 resize-none text-body"
            />
          </div>
        </Sheet>
      </main>

      <div className={mode === "full" ? "fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-border bg-paper px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3" : "pt-3"}>
        <Button onClick={handleOptimisticSave} disabled={!canSave || optimisticUpdates.size > 0} className="h-12 w-full text-body">
          {optimisticUpdates.size > 0 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              저장하는 중...
            </>
          ) : hasChanges ? (
            "바뀐 내용 저장"
          ) : (
            "바뀐 내용 없음"
          )}
        </Button>
      </div>
    </div>
  )
}
