import { redirect } from "next/navigation"

import { createSupabaseServerComponentClient } from "@/shared/infra/supabase-server"
import { safeNextPath } from "@/shared/lib/safe-next-path"
import {
	parsePartnerEntrySource,
	withPartnerEntry,
} from "@/shared/lib/partner-entry"
import SignupClient from "./signup-client"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams
	const next = safeNextPath(first(query.next))
	const partnerSource = parsePartnerEntrySource(first(query.from))

	const supabase = await createSupabaseServerComponentClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (user) redirect(withPartnerEntry(next, partnerSource))

	return <SignupClient next={next} partnerSource={partnerSource} />
}
