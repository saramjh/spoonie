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
import { Sheet } from "@/components/kit"
import GoogleAuthButton from "@/components/auth/GoogleAuthButton"
import { useRouter } from "@/shared/lib/navigation"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useToast } from "@/hooks/use-toast"
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
		<div className="min-h-screen flex flex-col items-center justify-start p-4">
			<main className="w-full max-w-sm mx-auto pt-8">
				<div className="text-center mb-6">
					<Link href="/" className="inline-flex" aria-label="Spoonie 홈">
						<Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
					</Link>
					<h1 className="mt-5 text-title text-ink">로그인</h1>
					{partnerCopy && <p className="mt-2 text-meta text-ink-soft">{partnerCopy.loginHint}</p>}
				</div>

				<Sheet className="p-6">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5">
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
										<FormControl><Input type="password" {...field} /></FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" disabled={form.formState.isSubmitting || isRedirecting} className="h-12 w-full text-body">
								{form.formState.isSubmitting || isRedirecting ? (
									<><Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />로그인 중</>
								) : "로그인"}
							</Button>
						</form>
					</Form>

					<div className="text-center mt-4 mb-6">
						<Link href={forgotHref} className="text-meta text-ink-soft hover:text-orange-ink transition-colors duration-200">비밀번호를 잊으셨나요?</Link>
					</div>

					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
						<div className="relative flex justify-center text-meta"><span className="bg-paper px-4 text-ink-soft font-medium">또는</span></div>
					</div>

					<GoogleAuthButton next={next} partnerSource={partnerSource} />
				</Sheet>

				<div className="mt-8 text-center">
					<span className="text-meta text-ink-soft">계정이 없으신가요? </span>
					<Link href={signupHref} className="text-label font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">회원가입</Link>
				</div>

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
