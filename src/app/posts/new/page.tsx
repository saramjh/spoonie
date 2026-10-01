'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import PostForm from "@/components/items/PostForm"
import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"
import { useNavigation } from "@/hooks/useNavigation"

export default function NewPostPage() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	// "이 레시피로 만들었어요" / 요리 모드에서 들어온 경우의 출처 (?source=레시피ID&origin=recipe_detail|cook_mode, from 은 화면 이동 기록용으로 이미 쓰인다)
	const [source, setSource] = useState<{ id: string | null; origin: "recipe_detail" | "cook_mode" | null }>({ id: null, origin: null })
	const supabase = createSupabaseBrowserClient()

	// 스마트 네비게이션 (이전 경로 추적)
	const { navigateBack } = useNavigation({ trackHistory: true })

	useEffect(() => {
		const params = new URLSearchParams(window.location.search)
		const sourceId = params.get("source")
		const origin = params.get("origin")
		setSource({
			id: sourceId && /^[0-9a-f-]{36}$/i.test(sourceId) ? sourceId : null,
			origin: origin === "recipe_detail" || origin === "cook_mode" ? origin : null,
		})
		const checkUser = async () => {
			const { data: { user } } = await supabase.auth.getUser()
			setUser(user)
			setIsLoading(false)
		}
		checkUser()
	}, [supabase])

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-ink"></div>
			</div>
		)
	}

	if (!user) {
		return (
			<CreateContentAuthPrompt contentType="post" />
		)
	}

	return <PostForm onNavigateBack={navigateBack} sourceRecipeId={source.id} sourceOrigin={source.origin} />
}