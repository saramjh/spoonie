import { resolveAuthEntryContext } from "@/shared/lib/partner-entry"
import ResetPasswordClient from "./reset-password-client"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
	const query = await searchParams
	const { next, partnerSource } = resolveAuthEntryContext(query)
	return <ResetPasswordClient next={next} partnerSource={partnerSource} expiredLink={query.error_code === "otp_expired"} />
}
