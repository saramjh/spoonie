"use client"

import Image from "next/image"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Sheet } from "@/components/kit"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useToast } from "@/hooks/use-toast"
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

		toast({
			title: "재설정 메일을 보냈어요",
			description: "메일의 링크에서 새 비밀번호를 설정해주세요.",
		})
		form.reset()
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-start p-4">
			<main className="w-full max-w-sm mx-auto pt-12">
				<div className="text-center mb-6">
					<Link href="/" className="inline-flex" aria-label="Spoonie 홈">
						<Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
					</Link>
					<h1 className="mt-5 text-title text-ink">비밀번호 찾기</h1>
					<p className="mt-1 text-meta text-ink-soft">가입 시 사용한 이메일 주소를 입력해주세요.</p>
				</div>

				<Sheet className="p-6">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-label font-medium text-ink">이메일 주소</FormLabel>
										<FormControl><Input {...field} /></FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" className="h-12 w-full text-body">재설정 링크 보내기</Button>
						</form>
					</Form>

					<div className="mt-8 text-center">
						<Link href={loginHref} className="text-label font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">
							로그인으로 돌아가기
						</Link>
					</div>
				</Sheet>
			</main>
		</div>
	)
}
