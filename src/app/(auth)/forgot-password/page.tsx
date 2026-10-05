import { resolveAuthEntryContext } from "@/shared/lib/partner-entry"
import ForgotPasswordClient from "./forgot-password-client"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
	const { next, partnerSource } = resolveAuthEntryContext(await searchParams)
	return <ForgotPasswordClient next={next} partnerSource={partnerSource} />
}
