"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Sheet } from "@/components/kit"
import GoogleAuthButton from "@/components/auth/GoogleAuthButton"
import { useHydrated } from "@/hooks/useHydrated"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "@/shared/lib/navigation"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { logEvent } from "@/shared/infra/events"
import { safeNextPath } from "@/shared/lib/safe-next-path"
import {
	authCallbackUrl,
	authEntryHref,
	parsePartnerEntrySource,
	partnerEntryCopy,
	withPartnerEntry,
} from "@/shared/lib/partner-entry"
import { generateUniqueUsername } from "@/features/profile/data/username-generator"

const formSchema = z
	.object({
		email: z.string().email({ message: "올바른 이메일을 입력해주세요." }),
		password: z.string().min(6, { message: "비밀번호는 6자 이상이어야 합니다." }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "비밀번호가 일치하지 않습니다.",
		path: ["confirmPassword"],
	})

export default function SignupPage() {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()
	const hydrated = useHydrated()
	const searchParams = hydrated ? new URLSearchParams(window.location.search) : null
	const next = safeNextPath(searchParams?.get("next"))
	const partnerSource = parsePartnerEntrySource(searchParams?.get("from"))
	const partnerCopy = partnerSource ? partnerEntryCopy[partnerSource] : null
	const loginHref = authEntryHref("/login", next, partnerSource)
	const [isRedirecting, setIsRedirecting] = useState(false)
	const [emailSent, setEmailSent] = useState(false)

	useEffect(() => {
		if (!hydrated) return
		let cancelled = false
		void supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session || cancelled) return
			setIsRedirecting(true)
			router.replace(withPartnerEntry(next, partnerSource))
		})
		return () => { cancelled = true }
	}, [hydrated, next, partnerSource, router, supabase])

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "", password: "", confirmPassword: "" },
	})

	const handleSignUp = async (values: z.infer<typeof formSchema>) => {
		const username = await generateUniqueUsername()
		const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
		const { data, error } = await supabase.auth.signUp({
			email: values.email,
			password: values.password,
			options: {
				emailRedirectTo: authCallbackUrl(origin, next, partnerSource),
				data: { username },
			},
		})

		if (error) {
			toast({ title: "회원가입 실패", description: error.message, variant: "destructive" })
			return
		}

		logEvent("signup_submitted", null, partnerSource ?? "standard")

		if (data.session) {
			setIsRedirecting(true)
			router.push(withPartnerEntry(next, partnerSource))
			router.refresh()
			return
		}

		setEmailSent(true)
	}

	const emailSentBody = partnerSource
		? partnerSource === "partner_creator"
			? "메일의 인증 링크를 누르면 기존 레시피 작성 화면으로 바로 이어집니다."
			: "메일의 인증 링크를 누르면 제품 활용 Recipe 작성 화면으로 바로 이어집니다."
		: "메일의 인증 링크를 누르면 가입이 완료됩니다."

	return (
		<div className="min-h-screen flex flex-col items-center justify-start p-4">
			<main className="w-full max-w-sm mx-auto pt-8">
				<div className="text-center mb-6">
					<Link href="/" className="inline-flex" aria-label="Spoonie 홈">
						<Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
					</Link>
					<h1 className="mt-5 text-title text-ink">회원가입</h1>
					{partnerCopy && <p className="mt-2 text-meta text-ink-soft">{partnerCopy.signupHint}</p>}
				</div>

				<Sheet className="p-6">
					{emailSent ? (
						<div>
							<h2 className="text-heading text-ink">인증 메일을 보냈어요</h2>
							<p className="mt-2 text-body text-ink-soft">{emailSentBody}</p>
							<p className="mt-3 text-meta text-ink-soft">메일이 보이지 않으면 스팸함도 확인해 주세요.</p>
							<Button asChild variant="outline" className="mt-5 h-12 w-full">
								<Link href={loginHref}>이미 인증했다면 로그인</Link>
							</Button>
						</div>
					) : (
						<>
							<GoogleAuthButton
								next={next}
								partnerSource={partnerSource}
								label={partnerSource ? "Google로 가입하고 Recipe 작성" : "Google로 계속하기"}
							/>

							<div className="relative my-6">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t border-border" />
								</div>
								<div className="relative flex justify-center text-meta">
									<span className="bg-paper px-4 text-ink-soft font-medium">또는 이메일로 가입</span>
								</div>
							</div>

							<Form {...form}>
								<form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-5">
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem className="space-y-1.5">
												<FormLabel className="text-label font-medium text-ink">이메일</FormLabel>
												<FormControl><Input {...field} /></FormControl>
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
												<FormControl><Input type="password" placeholder="6자 이상" {...field} /></FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="confirmPassword"
										render={({ field }) => (
											<FormItem className="space-y-1.5">
												<FormLabel className="text-label font-medium text-ink">비밀번호 확인</FormLabel>
												<FormControl><Input type="password" {...field} /></FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button
										type="submit"
										disabled={form.formState.isSubmitting || isRedirecting}
										className="h-12 w-full text-body"
									>
										{form.formState.isSubmitting || isRedirecting ? (
											<><Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />가입하는 중</>
										) : partnerCopy ? "이메일로 가입하고 Recipe 작성" : "이메일로 회원가입"}
									</Button>
								</form>
							</Form>
						</>
					)}
				</Sheet>

				{!emailSent && (
					<div className="mt-8 text-center">
						<span className="text-meta text-ink-soft">이미 계정이 있으신가요? </span>
						<Link href={loginHref} className="text-label font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">로그인</Link>
					</div>
				)}

				<div className="mt-6 text-center space-x-3">
					<Link href="/legal/privacy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">개인정보처리방침</Link>
					<span className="text-meta text-ink-soft/60">|</span>
					<Link href="/legal/terms" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">이용약관</Link>
					<span className="text-meta text-ink-soft/60">|</span>
					<Link href="/legal/policy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">운영정책</Link>
				</div>
			</main>
		</div>
	)
}
