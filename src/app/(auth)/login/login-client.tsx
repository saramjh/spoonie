"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { PageHeader } from "@/components/kit"
import GoogleAuthButton from "@/components/auth/GoogleAuthButton"
import { useRouter } from "@/shared/lib/navigation"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useHydrationReady } from "@/hooks/useHydrationReady"
import {
	authEntryHref,
	partnerEntryCopy,
	type PartnerEntrySource,
	withPartnerEntry,
} from "@/shared/lib/partner-entry"

const formSchema = z.object({
	email: z.string().email({ message: "올바른 이메일을 입력해주세요." }),
	password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
})

type Props = {
	next: string
	partnerSource: PartnerEntrySource | null
}

export default function LoginClient({ next, partnerSource }: Props) {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const isHydrated = useHydrationReady()
	const { toast } = useToast()
	const [isRedirecting, setIsRedirecting] = useState(false)
	const partnerCopy = partnerSource ? partnerEntryCopy[partnerSource] : null
	const signupHref = authEntryHref("/signup", next, partnerSource)
	const forgotHref = authEntryHref("/forgot-password", next, partnerSource)


	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "", password: "" },
	})

	const handleLogin = async (values: z.infer<typeof formSchema>) => {
		const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password })
		if (error) {
			toast({ title: "로그인 실패", description: "이메일 또는 비밀번호를 확인해주세요.", variant: "destructive" })
			return
		}
		setIsRedirecting(true)
		router.push(withPartnerEntry(next, partnerSource))
		router.refresh()
	}

	return (
		<div className="min-h-screen bg-paper">
			<PageHeader title="로그인" />
			<div className="mx-auto w-full max-w-md px-6 pb-16 pt-8">
				<div className="mb-7">
					<Link href="/" className="inline-flex" aria-label="Spoonie 홈">
						<Image src="/logo-full.svg" alt="Spoonie" width={140} height={45} priority />
					</Link>
					<h2 className="mt-5 text-[1.75rem]/tight font-bold tracking-tight text-ink">다시 만나 반가워요</h2>
					<p className="mt-2 text-label text-ink-soft">남겨 둔 레시피를 다시 꺼내 봐요.</p>
					{partnerCopy && <p className="mt-2 text-meta text-ink-soft">{partnerCopy.loginHint}</p>}
				</div>

				<div>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-label font-medium text-ink">이메일</FormLabel>
										<FormControl><Input className="h-12" {...field} /></FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-label font-medium text-ink">비밀번호</FormLabel>
										<FormControl><Input type="password" className="h-12" {...field} /></FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" disabled={!isHydrated || form.formState.isSubmitting || isRedirecting} className="h-12 w-full text-body">
								{form.formState.isSubmitting || isRedirecting ? (
									<><Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />로그인 중</>
								) : "로그인"}
							</Button>
						</form>
					</Form>


					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
						<div className="relative flex justify-center text-meta"><span className="bg-paper px-4 text-ink-soft font-medium">또는</span></div>
					</div>

					<GoogleAuthButton next={next} partnerSource={partnerSource} />
				</div>

				<div className="mt-8 flex items-center justify-between gap-4">
					<Link href={signupHref} className="min-h-11 inline-flex items-center text-label font-semibold text-orange-ink underline underline-offset-4">회원가입</Link>
					<Link href={forgotHref} className="min-h-11 inline-flex items-center text-label font-semibold text-orange-ink underline underline-offset-4">비밀번호 찾기</Link>
				</div>

				<div className="mt-6 text-center space-x-3">
					<Link href="/legal/privacy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">개인정보처리방침</Link>
					<span className="text-meta text-ink-soft/60">|</span>
					<Link href="/legal/terms" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">이용약관</Link>
					<span className="text-meta text-ink-soft/60">|</span>
					<Link href="/legal/policy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">운영정책</Link>
				</div>
			</div>
		</div>
	)
}
