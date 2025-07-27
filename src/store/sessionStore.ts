import { create } from "zustand"
import { User } from "@supabase/supabase-js"

// UserProfile 타입을 정의하여 public_id를 포함시킵니다.
interface UserProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	public_id: string | null // nullable로 변경
}

interface SessionState {
	session: User | null
	profile: UserProfile | null // 프로필 정보를 저장할 상태
	isInitialLoad: boolean
	setSession: (session: User | null) => void
	setProfile: (profile: UserProfile | null) => void // 프로필 설정 함수
	setInitialLoad: (isLoad: boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
	session: null,
	profile: null,
	isInitialLoad: true,
	setSession: (session) => set({ session }),
	setProfile: (profile) => set({ profile }),
	setInitialLoad: (isLoad) => set({ isInitialLoad: isLoad }),
}))
