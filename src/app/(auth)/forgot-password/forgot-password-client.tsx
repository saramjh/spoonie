"use client"

import { useState } from "react"
import Link from "next/link"
import AuthScreen from "@/components/auth/AuthScreen"
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

const formSchema = z.object({
	email: z.string().email({ message: "올바른 이메일 주소를 입력해주세요." }),
})

type Props = {
	next: string
	partnerSource: PartnerEntrySource | null
}

export default function ForgotPasswordClient({ next, partnerSource }: Props) {
	const supabase = createSupabaseBrowserClient()
	const isHydrated = useHydrationReady()
	const [requestComplete, setRequestComplete] = useState(false)
	const { toast } = useToast()
	const loginHref = authEntryHref("/login", next, partnerSource)

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { email: "" },
	})

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
		const redirectUrl = origin + authEntryHref("/reset-password", next, partnerSource)

		const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo: redirectUrl })

		if (error) {
			toast({
				title: "오류",
				description: "비밀번호 재설정 요청에 실패했습니다. 잠시 후 다시 시도해주세요.",
				variant: "destructive",
			})
			return
		}

		setRequestComplete(true)
		form.reset()
	}

	return (
		<AuthScreen title="비밀번호 찾기" intro={{ heading: "비밀번호를 잊으셨나요?", description: "가입한 이메일로 재설정 링크를 보내드려요." }}>
			<div>
				{requestComplete ? (
					<StateSheet title="재설정 메일을 보냈어요"
						body="메일의 링크로 새 비밀번호를 설정해 주세요. 메일이 없다면 스팸함도 확인해 주세요."
						action={<Button asChild variant="outline"><Link href={loginHref}>로그인으로 돌아가기</Link></Button>} />
				) : (
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="space-y-1.5">
									<FormLabel className="text-label font-medium text-ink">이메일 주소</FormLabel>
									<FormControl><Input className="h-12" {...field} /></FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" disabled={!isHydrated} className="h-12 w-full text-body">재설정 링크 보내기</Button>
					</form>
				</Form>
				)}

				{!requestComplete && <div className="mt-8 text-center">
					<Link href={loginHref} className="text-label font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">
						로그인으로 돌아가기
					</Link>
				</div>}
			</div>
		</AuthScreen>
	)
}
