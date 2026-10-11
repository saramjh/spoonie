'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client'
import { User } from '@supabase/supabase-js'
import PostForm from "@/components/items/PostForm"
import { PageLoading, StateSheet } from "@/components/kit"
import { Button } from "@/components/ui/button"
import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"
import { useNavigation } from "@/hooks/useNavigation"
import { readPostSource } from "@/features/post/domain/post-form"

export default function NewPostPage() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [authError, setAuthError] = useState(false)
	const supabase = createSupabaseBrowserClient()

	const { navigateBack } = useNavigation()

	useEffect(() => {
		let active = true
		const checkUser = async () => {
			const { data: { user }, error } = await supabase.auth.getUser()
			// 비로그인은 정상 상태지만, 네트워크/토큰 조회 실패는 로그인 안내로 숨기지 않는다.
			if (error && error.name !== "AuthSessionMissingError") throw error
			if (!active) return
			setUser(user)
			setIsLoading(false)
		}
		void checkUser().catch((error: unknown) => {
			console.error("Recipeed auth check failed:", error)
			if (active) {
				setAuthError(true)
				setIsLoading(false)
			}
		})
		return () => { active = false }
	}, [supabase])

	if (isLoading) {
		return (
			<PageLoading />
		)
	}

	if (authError) {
		return (
			<div className="px-3 pt-3">
				<StateSheet
					headingLevel="h1"
					title="로그인 상태를 확인할 수 없습니다"
					body="인터넷 연결을 확인하고 다시 시도해 주세요."
					action={<Button type="button" onClick={() => window.location.reload()}>다시 시도</Button>}
				/>
			</div>
		)
	}

	if (!user) {
		return <CreateContentAuthPrompt contentType="post" />
	}

	// 로그인 확인이 끝난 뒤(브라우저)에만 그리므로 주소를 바로 읽는다
	const source = readPostSource(window.location.search)
	return <PostForm userId={user.id} onNavigateBack={navigateBack} sourceRecipeId={source.id} sourceOrigin={source.origin} />
}
