"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "@/shared/lib/navigation"
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
}

export default function ResetPasswordClient({ next, partnerSource }: Props) {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()
	const loginHref = authEntryHref("/login", next, partnerSource)

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: { password: "", confirmPassword: "" },
	})

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		const { error } = await supabase.auth.updateUser({ password: values.password })

		if (error) {
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
		<div className="min-h-screen flex flex-col items-center justify-start p-4">
			<main className="w-full max-w-sm mx-auto pt-12">
				<div className="text-center mb-6">
					<Link href="/" className="inline-flex" aria-label="Spoonie 홈">
						<Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
					</Link>
					<h1 className="mt-5 text-title text-ink">새 비밀번호 설정</h1>
					<p className="mt-1 text-meta text-ink-soft">새로운 비밀번호를 입력해주세요.</p>
				</div>

				<Sheet className="p-6">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-label font-medium text-ink">새 비밀번호</FormLabel>
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
										<FormLabel className="text-label font-medium text-ink">새 비밀번호 확인</FormLabel>
										<FormControl><Input type="password" {...field} /></FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" className="h-12 w-full text-body">비밀번호 재설정</Button>
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
