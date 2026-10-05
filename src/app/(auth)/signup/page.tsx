import { redirect } from "next/navigation"

import { createSupabaseServerComponentClient } from "@/shared/infra/supabase-server"
import {
	resolveAuthEntryContext,
	withPartnerEntry,
} from "@/shared/lib/partner-entry"
import SignupClient from "./signup-client"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
	const { next, partnerSource } = resolveAuthEntryContext(await searchParams)

	const supabase = await createSupabaseServerComponentClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (user) redirect(withPartnerEntry(next, partnerSource))

	return <SignupClient next={next} partnerSource={partnerSource} />
}
