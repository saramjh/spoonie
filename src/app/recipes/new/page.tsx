'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { User } from '@supabase/supabase-js'
import RecipeForm from "@/components/recipe/RecipeForm"
import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"

export default function NewRecipePage() {
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
			<CreateContentAuthPrompt contentType="recipe">
				<RecipeForm />
			</CreateContentAuthPrompt>
		)
	}

	return <RecipeForm />
}