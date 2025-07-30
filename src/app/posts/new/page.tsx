'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import PostForm from "@/components/items/PostForm"
import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"

export default function NewPostPage() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const supabase = createSupabaseBrowserClient()

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
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
			</div>
		)
	}

	if (!user) {
		return (
			<CreateContentAuthPrompt contentType="post">
				<PostForm />
			</CreateContentAuthPrompt>
		)
	}

	return <PostForm />
}