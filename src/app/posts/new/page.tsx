'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client'
import { User } from '@supabase/supabase-js'
import PostForm from "@/components/items/PostForm"
import { PageLoading } from "@/components/kit"
import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"
import { useNavigation } from "@/hooks/useNavigation"
import { readPostSource } from "@/features/post/domain/post-form"

export default function NewPostPage() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const supabase = createSupabaseBrowserClient()

	const { navigateBack } = useNavigation()

	useEffect(() => {
		const checkUser = async () => {
			const { data: { user } } = await supabase.auth.getUser()
			setUser(user)
			setIsLoading(false)
		}
		checkUser()
	}, [supabase])

	if (isLoading) {
		return (
			<PageLoading />
		)
	}

	if (!user) {
		return (
			<CreateContentAuthPrompt contentType="post" />
		)
	}

	// 로그인 확인이 끝난 뒤(브라우저)에만 그리므로 주소를 바로 읽는다
	const source = readPostSource(window.location.search)
	return <PostForm onNavigateBack={navigateBack} sourceRecipeId={source.id} sourceOrigin={source.origin} />
}
