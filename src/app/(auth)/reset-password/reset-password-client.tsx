"use client"

import { useState } from "react"
import Link from "next/link"
import AuthScreen from "@/components/auth/AuthScreen"
import { useRouter } from "@/shared/lib/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { StateSheet } from "@/components/kit"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useHydrationReady } from "@/hooks/useHydrationReady"
import { authEntryHref, type PartnerEntrySource } from "@/shared/lib/partner-entry"

const formSchema = z
	.object({
		password: z.string().min(6, { message: "새 비밀번호는 6자 이상이어야 합니다." }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "비밀번호가 일치하지 않습니다.",
		path: ["confirmPassword"],
	})

type Props = {
	next: string
	partnerSource: PartnerEntrySource | null
	expiredLink: boolean
}

export default function ResetPasswordClient({ next, partnerSource, expiredLink }: Props) {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const isHydrated = useHydrationReady()
	const [linkExpired, setLinkExpired] = useState(false)
	const expired = expiredLink || linkExpired || (
		isHydrated && new URLSearchParams(window.location.hash.slice(1)).get("error_code") === "otp_expired"
	)
	const { toast } = useToast()
	const loginHref = authEntryHref("/login", next, partnerSource)

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { password: "", confirmPassword: "" },
	})

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		const { error } = await supabase.auth.updateUser({ password: values.password })

		if (error) {
			if (error.status === 401 || error.code === "otp_expired" || error.code === "session_not_found" || error.name === "AuthSessionMissingError") {
				setLinkExpired(true)
				return
			}
			toast({
				title: "오류",
				description: "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.",
				variant: "destructive",
			})
			return
		}

		toast({ title: "비밀번호를 바꿨어요", description: "다시 로그인하면 이어서 작성할 수 있습니다." })
		router.replace(loginHref)
	}

	return (
		<AuthScreen title="비밀번호 재설정" intro={expired ? undefined : { heading: "새 비밀번호 만들기", description: "새 비밀번호를 입력해 주세요." }}>
			<div>
				{expired ? (
					<StateSheet title="재설정 링크가 만료됐어요"
							body="안전하게 새 링크를 요청한 뒤 다시 설정해 주세요."
							action={<Button asChild><Link href={authEntryHref("/forgot-password", next, partnerSource)}>새 링크 요청</Link></Button>} />
				) : (
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem className="space-y-1.5">
									<FormLabel className="text-label font-medium text-ink">새 비밀번호</FormLabel>
									<FormControl><Input type="password" className="h-12" placeholder="6자 이상" {...field} /></FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem className="space-y-1.5">
									<FormLabel className="text-label font-medium text-ink">새 비밀번호 확인</FormLabel>
									<FormControl><Input type="password" className="h-12" {...field} /></FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" disabled={!isHydrated} className="h-12 w-full text-body">비밀번호 재설정</Button>
					</form>
				</Form>
				)}

				<div className="mt-8 text-center">
					<Link href={loginHref} className="text-label font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">
						로그인으로 돌아가기
					</Link>
				</div>
			</div>
		</AuthScreen>
	)
}
