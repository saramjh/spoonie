'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import RecipeForm from "@/components/recipe/RecipeForm"
import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"
import { useNavigation } from "@/hooks/useNavigation"
import { fetchItemDetail } from "@/lib/item-detail"
import type { ItemDetail } from "@/types/item"

export default function NewRecipePage() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	// "참고해서 내 레시피 만들기"로 들어온 경우의 원본 (?fork=레시피ID)
	const [forkFrom, setForkFrom] = useState<ItemDetail | null>(null)
	const supabase = createSupabaseBrowserClient()

	// 스마트 네비게이션 (이전 경로 추적)
	const { navigateBack } = useNavigation({ trackHistory: true })

	useEffect(() => {
		const checkUser = async () => {
			const { data: { user } } = await supabase.auth.getUser()
			setUser(user)
			const forkId = new URLSearchParams(window.location.search).get("fork")
			if (user && forkId && /^[0-9a-f-]{36}$/i.test(forkId)) {
				const source = await fetchItemDetail(supabase, forkId).catch(() => null)
				if (source?.item_type === "recipe") setForkFrom(source)
			}
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
			<CreateContentAuthPrompt contentType="recipe" />
		)
	}

	return <RecipeForm onNavigateBack={navigateBack} forkFrom={forkFrom} />
}