"use client"

import { FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader, Sheet } from "@/components/kit"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { partnerEntryCopy, type PartnerEntrySource } from "@/shared/lib/partner-entry"
import { useToast } from "@/hooks/use-toast"

interface PartnerIdentityStepProps {
	userId: string
	source: PartnerEntrySource
	initialName?: string
	onContinue: (name: string) => void
}

export default function PartnerIdentityStep({ userId, source, initialName = "", onContinue }: PartnerIdentityStepProps) {
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()
	const [name, setName] = useState(initialName)
	const [saving, setSaving] = useState(false)
	const copy = partnerEntryCopy[source]

	const submit = async (event: FormEvent) => {
		event.preventDefault()
		const displayName = name.trim()
		if (!displayName) return
		setSaving(true)
		const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId)
		setSaving(false)
		if (error) {
			toast({ title: "이름 저장 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" })
			return
		}
		onContinue(displayName)
	}

	return (
		<div className="min-h-screen">
			<PageHeader leading="cancel" title="Recipe 쓰기" />
			<div className="px-3 pt-3">
				<Sheet className="p-5">
					<h2 className="text-heading text-ink">{copy.identityTitle}</h2>
					<p className="mt-2 text-meta text-ink-soft">{copy.identityBody}</p>
					<form onSubmit={submit} className="mt-5 space-y-4">
						<div>
							<label htmlFor="partner-display-name" className="text-label font-medium text-ink">표시 이름</label>
							<Input
								id="partner-display-name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								maxLength={40}
								autoComplete="nickname"
								className="mt-1.5 h-12"
								autoFocus
							/>
						</div>
						<Button type="submit" className="h-12 w-full" disabled={!name.trim() || saving}>
							{saving ? "저장하는 중..." : "이 이름으로 Recipe 작성"}
						</Button>
					</form>
				</Sheet>
			</div>
		</div>
	)
}
