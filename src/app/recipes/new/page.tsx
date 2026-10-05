'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client'
import type { User } from '@supabase/supabase-js'
import RecipeForm from "@/features/recipe/components/RecipeForm"
import { PageLoading } from "@/components/kit"
import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"
import PartnerIdentityStep from "@/components/auth/PartnerIdentityStep"
import { useNavigation } from "@/hooks/useNavigation"
import { fetchItemDetail } from "@/features/feed/data/item-detail"
import { logEvent } from "@/shared/infra/events"
import { parsePartnerEntrySource, type PartnerEntrySource } from "@/shared/lib/partner-entry"
import type { ItemDetail } from "@/types/item"

export default function NewRecipePage() {
	const [user, setUser] = useState<User | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [forkFrom, setForkFrom] = useState<ItemDetail | null>(null)
	const [partnerSource, setPartnerSource] = useState<PartnerEntrySource | null>(null)
	const [needsIdentity, setNeedsIdentity] = useState(false)
	const [identityDefault, setIdentityDefault] = useState("")
	const supabase = createSupabaseBrowserClient()
	const { navigateBack } = useNavigation()

	useEffect(() => {
		const checkUser = async () => {
			const { data: { user: currentUser } } = await supabase.auth.getUser()
			setUser(currentUser)

			const params = new URLSearchParams(window.location.search)
			const source = parsePartnerEntrySource(params.get("entry"))
			setPartnerSource(source)

			const forkId = params.get("fork")
			if (currentUser && forkId && /^[0-9a-f-]{36}$/i.test(forkId)) {
				const sourceRecipe = await fetchItemDetail(supabase, forkId).catch(() => null)
				if (sourceRecipe?.item_type === "recipe") setForkFrom(sourceRecipe)
			}

			if (currentUser && source) {
				const key = `partner-auth-complete:${currentUser.id}:${source}`
				if (!sessionStorage.getItem(key)) {
					await logEvent("partner_auth_complete", null, source)
					sessionStorage.setItem(key, "1")
				}

				const { data: profile } = await supabase
					.from("profiles")
					.select("display_name, username")
					.eq("id", currentUser.id)
					.maybeSingle()

				if (profile && !profile.display_name?.trim()) {
					const providerName = String(
						currentUser.user_metadata?.full_name ||
						currentUser.user_metadata?.name ||
						"",
					).trim()
					setIdentityDefault(providerName)
					setNeedsIdentity(true)
				}
			}

			setIsLoading(false)
		}
		checkUser()
	}, [supabase])

	if (isLoading) return <PageLoading />

	if (!user) return <CreateContentAuthPrompt contentType="recipe" />

	if (partnerSource && needsIdentity) {
		return (
			<PartnerIdentityStep
				userId={user.id}
				source={partnerSource}
				initialName={identityDefault}
				onContinue={() => setNeedsIdentity(false)}
			/>
		)
	}

	return (
		<RecipeForm
			onNavigateBack={navigateBack}
			forkFrom={forkFrom}
			entrySource={partnerSource}
		/>
	)
}
