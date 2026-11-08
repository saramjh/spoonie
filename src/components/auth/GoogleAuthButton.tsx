"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { authCallbackUrl, type PartnerEntrySource } from "@/shared/lib/partner-entry"

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
		<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
		<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
		<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
		<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
	</svg>
)

interface GoogleAuthButtonProps {
	next: string
	partnerSource: PartnerEntrySource | null
	label?: string
}

export default function GoogleAuthButton({ next, partnerSource, label = "Google로 계속하기" }: GoogleAuthButtonProps) {
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()
	const [isRedirecting, setIsRedirecting] = useState(false)

	const handleGoogleAuth = async () => {
		const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
		setIsRedirecting(true)
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: authCallbackUrl(origin, next, partnerSource),
				queryParams: { prompt: "select_account" },
			},
		})
		if (!error) return
		setIsRedirecting(false)
		toast({
			title: "Google 로그인 실패",
			description: "Google 인증을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.",
			variant: "destructive",
		})
	}

	return (
		<Button
			type="button"
			variant="outline"
			className="h-12 w-full text-body"
			onClick={handleGoogleAuth}
			disabled={isRedirecting}
		>
			{isRedirecting ? <Loader2 className="mr-3 h-5 w-5 animate-spin" aria-hidden /> : <GoogleIcon className="mr-3" />}
			{label}
		</Button>
	)
}
