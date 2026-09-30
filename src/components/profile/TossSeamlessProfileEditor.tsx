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
import { Badge } from "@/components/ui/badge"
import { 
  Camera, ArrowLeft, Save, Loader2, Check, Sparkles, 
  Lightbulb, Info, RefreshCw, Upload, CheckCircle, XCircle
} from "lucide-react"
import { validateUsername, checkUsernameAvailability, generateUniqueUsername } from "@/lib/username-generator"
import { useSessionStore } from "@/store/sessionStore"
import { getCacheManager } from "@/lib/unified-cache-manager"

interface Profile {
  username: string | null
  avatar_url: string | null
  profile_message: string | null
  username_changed_count?: number
}

interface TossSeamlessProfileEditorProps {
  mode?: 'full' | 'inline' | 'modal'
  onSaveComplete?: () => void
}

export default function TossSeamlessProfileEditor({ 
  mode = 'full',
  onSaveComplete 
}: TossSeamlessProfileEditorProps) {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const { toast } = useToast()

  // Zustand store에서 프로필 정보 가져오기
  const { profile: sessionProfile, setProfile: setSessionProfile } = useSessionStore()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [initialProfile, setInitialProfile] = useState<Profile | null>(null)
  
  // 🚀 토스식 상태 관리 - 즉시 반응형
  const [formData, setFormData] = useState({
    username: "",
    profileMessage: "",
    avatarUrl: null as string | null,
    avatarFile: null as File | null
  })
  
  // 🎯 실시간 검증 상태
  const [validation, setValidation] = useState({
    username: { isValid: true, error: "", isChecking: false },
    canChangeUsername: true,
    isGenerating: false
  })
  
  // 🚀 토스식 미리보기 상태
  const [preview, setPreview] = useState<{
    visible: boolean
    data: {
      username: string
      profile_message: string
      avatar_url: string | null
    } | null
  }>({
    visible: false,
    data: null
  })
  
  // 🎯 Seamless sync를 위한 optimistic update 추적
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())
  const rollbackFunctions = useRef<Map<string, () => void>>(new Map())

  /**
   * 🚀 토스식 즉시 프리뷰 업데이트
   */
  const updatePreview = useCallback(() => {
    setPreview({
      visible: true,
      data: {
        username: formData.username || "유저명을 입력하세요",
        profile_message: formData.profileMessage || "프로필 메시지를 입력하세요",
        avatar_url: formData.avatarUrl || sessionProfile?.avatar_url || null
      }
    })
  }, [formData, sessionProfile])

  /**
   * 🚀 Seamless 유저명 검증 (Optimistic + Debounced)
   */
  const validateUsernameSeamless = useCallback(
    async (username: string) => {
      if (!username || username === initialProfile?.username) {
        setValidation(prev => ({ ...prev, username: { isValid: true, error: "", isChecking: false } }))
        return true
      }

      setValidation(prev => ({ ...prev, username: { ...prev.username, isChecking: true } }))

      // 🎯 클라이언트 사이드 검증 (즉시)
      const clientValidation = validateUsername(username)
      if (!clientValidation.isValid) {
        setValidation(prev => ({ 
          ...prev, 
          username: { isValid: false, error: clientValidation.error || "", isChecking: false } 
        }))
        return false
      }

      // 🚀 서버 사이드 검증 (디바운스)
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
   * 🚀 토스식 스마트 유저명 생성
   */
  const generateSmartUsername = async () => {
    setValidation(prev => ({ ...prev, isGenerating: true }))
    
    try {
      const newUsername = await generateUniqueUsername()
      setFormData(prev => ({ ...prev, username: newUsername }))
      
      // 🎯 즉시 미리보기 업데이트
      updatePreview()
      
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
   * 🚀 Seamless 아바타 업로드 (즉시 미리보기)
   */
  const handleAvatarUpload = useCallback((file: File) => {
    // 즉시 로컬 미리보기
    const previewUrl = URL.createObjectURL(file)
    setFormData(prev => ({ 
      ...prev, 
      avatarFile: file, 
      avatarUrl: previewUrl 
    }))
    
    // 즉시 프리뷰 업데이트
    updatePreview()
    
    // 햅틱 피드백
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50])
    }
  }, [updatePreview])

  /**
   * 🚀 Optimistic Profile Update (0ms 응답)
   */
  const handleOptimisticSave = async () => {
    if (!user) return

    const updateId = `profile_update_${Date.now()}`
    setOptimisticUpdates(prev => new Set(prev).add(updateId))

    try {
      // 🎯 STEP 1: 즉시 SessionStore 업데이트 (0ms)
      if (sessionProfile) {
        const optimisticProfile = {
          ...sessionProfile,
          username: formData.username,
          avatar_url: formData.avatarUrl
        }
        setSessionProfile(optimisticProfile)
      }

      // 🎯 STEP 2: 캐시 매니저를 통한 전역 업데이트 (선택적)
      let rollback: (() => void) | null = null
      
      try {
        const profileUpdateOperation = {
          type: 'update' as const,
          itemId: user.id,
          userId: user.id,
          data: {
            username: formData.username,
            profile_message: formData.profileMessage,
            avatar_url: formData.avatarUrl
          }
        }

        // 🚀 Optimistic update 실행 + 롤백 함수 보관
        const manager = getCacheManager()
        rollback = await manager.optimisticUpdate(profileUpdateOperation)
        if (rollback) {
          rollbackFunctions.current.set(updateId, rollback)
        }
      } catch (cacheError) {
        console.warn('Cache manager integration failed, continuing without it:', cacheError)
        // 캐시 매니저 실패 시에도 계속 진행
      }

      // 🎯 STEP 3: 백그라운드에서 실제 DB 업데이트
      await performActualProfileUpdate()

      // 🎯 성공 시 optimistic update 확정
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateId)
        return newSet
      })
      rollbackFunctions.current.delete(updateId)

      // 🎉 토스식 성공 피드백
      toast({
        title: "프로필 저장 완료! 🎉",
        description: "변경사항이 즉시 반영되었어요",
      })

      if (onSaveComplete) {
        onSaveComplete()
      } else {
        router.push(`/profile/${sessionProfile?.public_id || user.id}`)
      }

    } catch (error) {
      console.error('Profile save failed:', error)
      
      // 🔄 실패 시 자동 롤백
      const rollback = rollbackFunctions.current.get(updateId)
      if (rollback) {
        try {
          rollback()
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError)
        }
        rollbackFunctions.current.delete(updateId)
      }

      // 🔄 Session Store 롤백
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

      // 🎯 더 자세한 에러 메시지 제공
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
   * 🔧 실제 DB 업데이트 수행
   */
  const performActualProfileUpdate = async () => {
    if (!user) throw new Error('User not found')



    let finalAvatarUrl = initialProfile?.avatar_url // 기본값을 기존 아바타로 설정

    // 아바타 파일 업로드
    if (formData.avatarFile) {
      const fileExtension = formData.avatarFile.name.split(".").pop()
      const filePath = `${user.id}.${fileExtension}`
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, formData.avatarFile, { upsert: true })
      
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)
      
      finalAvatarUrl = `${publicUrl}?t=${new Date().getTime()}`
    }

    // 🎯 유저명 변경 여부 확인
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

  // 🎯 폼 데이터 변경 시 실시간 미리보기 업데이트
  useEffect(() => {
    updatePreview()
  }, [updatePreview])

  // 🎯 유저명 변경 시 실시간 검증
  useEffect(() => {
    if (formData.username) {
      const timeoutId = setTimeout(() => {
        validateUsernameSeamless(formData.username)
      }, 300) // 300ms 디바운스

      return () => clearTimeout(timeoutId)
    }
  }, [formData.username, validateUsernameSeamless])

  // 🎯 초기 데이터 로드
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
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  const currentAvatarUrl = formData.avatarUrl || sessionProfile?.avatar_url || "/icon-only.svg"

  return (
    <div className={`${mode === 'full' ? 'p-4 max-w-md mx-auto' : 'space-y-6'}`}>
      {mode === 'full' && (
        <header className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <h1 className="text-xl font-bold">프로필 수정</h1>
          <div className="w-10" /> {/* 스페이서 */}
        </header>
      )}

      <main className="space-y-8">
        {/* 🎨 토스식 아바타 업로드 섹션 */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative group">
            <div className="relative w-24 h-24">
              <Image 
                src={currentAvatarUrl} 
                alt="프로필 이미지" 
                width={96} 
                height={96} 
                priority
                className="rounded-full object-cover w-full h-full transition-all duration-300 group-hover:brightness-75" 
              />
              
              {/* 호버 시 업로드 버튼 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <label htmlFor="avatar-upload" className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
            
            {/* 변경사항 인디케이터 */}
            {formData.avatarFile && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* 드래그 앤 드롭 영역 */}
          <div className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
            <label htmlFor="avatar-upload-drag" className="block cursor-pointer">
              <div className="text-center">
                <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  사진을 드래그하거나 <span className="text-orange-500 font-medium">파일 선택</span>
                </p>
              </div>
              <input 
                id="avatar-upload-drag" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        {/* 🎯 토스식 유저명 입력 */}
        <div className="space-y-3">
          <Label htmlFor="username">사용자 이름</Label>
          
          <div className="relative">
            <Input 
              id="username" 
              value={formData.username} 
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="한글 10자, 영문 20자 이내" 
              disabled={!validation.canChangeUsername}
              className={`${validation.canChangeUsername ? "pr-20" : ""} ${
                validation.username.error ? "border-red-300 focus:border-red-500" : 
                validation.username.isValid && formData.username ? "border-green-300 focus:border-green-500" : ""
              }`}
            />
            
            {/* 실시간 검증 상태 표시 */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              {validation.username.isChecking && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
              {!validation.username.isChecking && validation.username.isValid && formData.username && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {!validation.username.isChecking && validation.username.error && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>

            {/* 스마트 생성 버튼 */}
            {validation.canChangeUsername && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={generateSmartUsername} 
                disabled={validation.isGenerating} 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 text-xs hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${validation.isGenerating ? "animate-spin" : ""}`} />
                생성
              </Button>
            )}
          </div>
          
          {/* 상태별 안내 메시지 */}
          {!validation.canChangeUsername ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">이미 변경을 완료했어요</p>
                  <p className="text-xs text-amber-600 mt-1">
                    유저명은 1회만 변경 가능해서, 다음 기회에 신중히 선택해주세요! 😊
                  </p>
                </div>
              </div>
            </div>
          ) : validation.username.error ? (
            <p className="text-xs text-red-500 flex items-center">
              <XCircle className="w-3 h-3 mr-1" />
              {validation.username.error}
            </p>
          ) : formData.username && formData.username !== (initialProfile?.username || "") ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">신중하게 선택해주세요</p>
                  <p className="text-xs text-blue-600 mt-1">
                    유저명은 1회만 변경할 수 있어요. ⚠️
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              사용자 이름은 1회만 변경할 수 있어요. 생성 버튼을 활용해보세요! 🎲
            </p>
          )}
        </div>

        {/* 🎯 프로필 메시지 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="profileMessage">프로필 메시지</Label>
            <span className={`text-xs transition-colors ${
              formData.profileMessage.length > 130 
                ? 'text-orange-600 font-medium' 
                : 'text-gray-400'
            }`}>
              {formData.profileMessage.length} / 150
            </span>
          </div>
          <Textarea 
            id="profileMessage" 
            value={formData.profileMessage} 
            onChange={(e) => setFormData(prev => ({ ...prev, profileMessage: e.target.value }))}
            placeholder="자신을 소개해보세요. 줄바꿈을 이용해 읽기 쉽게 작성하면 더 좋아요! ✨" 
            maxLength={150} 
            className="h-24 resize-none leading-relaxed" 
          />
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-gray-500 leading-relaxed">
              💡 <span className="font-medium">토스 팁:</span> 긴 단어나 링크는 자동으로 줄바꿈됩니다. 
              {formData.profileMessage.length === 0 && "문단을 나누면 더 읽기 쉬워요!"}
              {formData.profileMessage.length > 0 && formData.profileMessage.length <= 50 && "조금 더 자세히 소개해보세요."}
              {formData.profileMessage.length > 50 && formData.profileMessage.length <= 130 && "적당한 길이예요! 👍"}
              {formData.profileMessage.length > 130 && "거의 다 찼어요!"}
            </p>
          </div>
        </div>

        {/* 🎨 실시간 미리보기 */}
        {preview.visible && hasChanges && (
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                <Sparkles className="w-4 h-4 mr-1 text-orange-500" />
                미리보기
              </h3>
              <Badge variant="secondary" className="text-xs">실시간 업데이트</Badge>
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center space-x-3">
                <Image 
                  src={preview.data?.avatar_url || "/icon-only.svg"} 
                  alt="미리보기"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {preview.data?.username}
                  </p>
                  {preview.data?.profile_message && (
                    <div className="text-sm text-gray-500 leading-relaxed break-words hyphens-auto max-w-full mt-1">
                      <p className="whitespace-pre-wrap line-clamp-2">
                        {preview.data.profile_message}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🚀 토스식 저장 버튼 */}
        <div className="space-y-4">
          <Button 
            onClick={handleOptimisticSave}
            disabled={!canSave || optimisticUpdates.size > 0}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {optimisticUpdates.size > 0 ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                프로필 저장
              </>
            )}
          </Button>



          {/* 변경사항 요약 */}
          {hasChanges && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-1" />
                변경 예정
              </h4>
              <div className="space-y-1 text-xs text-blue-700">
                {formData.avatarFile && <div>• 프로필 사진 변경</div>}
                {formData.username !== (initialProfile?.username || "") && (
                  <div>• 유저명: {initialProfile?.username || "없음"} → {formData.username}</div>
                )}
                {formData.profileMessage !== (initialProfile?.profile_message || "") && (
                  <div>• 프로필 메시지 수정</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}