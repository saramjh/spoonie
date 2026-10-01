"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "@/lib/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Sheet } from "@/components/kit"

const formSchema = z
	.object({
		password: z.string().min(6, { message: "새 비밀번호는 6자 이상이어야 합니다." }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "비밀번호가 일치하지 않습니다.",
		path: ["confirmPassword"],
	})

export default function ResetPasswordPage() {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	})

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		const { error } = await supabase.auth.updateUser({
			password: values.password,
		})

		if (error) {
			toast({
				title: "오류",
				description: "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.",
				variant: "destructive",
			})
		} else {
			toast({
				title: "성공",
				description: "비밀번호가 성공적으로 재설정되었습니다. 2초 후 로그인 페이지로 이동합니다.",
			})
			setTimeout(() => {
				router.push("/login")
			}, 2000)
		}
	}

						return (
			<div className="min-h-screen flex flex-col items-center justify-start p-4">
				{/* 토스 스타일 그라디언트 배경 */}
				{/* 상단 여백 + 카드 컨테이너 */}
				<main className="w-full max-w-sm mx-auto pt-16 sm:pt-20">
					{/* 컴팩트한 브랜드 영역 */}
					<div className="text-center mb-6">
					<Link href="/" className="inline-block">
						<div className="inline-block mb-4">
							<Image src="/icon-only.svg" alt="스푸니" width={32} height={32} />
						</div>
					</Link>
					<h1 className="text-2xl font-bold text-ink mb-1">새 비밀번호 설정</h1>
					<p className="text-sm text-ink-soft">새로운 비밀번호를 입력해주세요.</p>
				</div>

				{/* 비밀번호 재설정 카드 */}
				<Sheet className="p-6">

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-sm font-medium text-ink">새 비밀번호</FormLabel>
										<FormControl>
											<Input 
												type="password" 
												placeholder="6자 이상" 
												{...field} 
												className="h-12 rounded-md border border-ink/40 bg-paper text-base focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0" 
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-sm font-medium text-ink">새 비밀번호 확인</FormLabel>
										<FormControl>
											<Input 
												type="password" 
												 
												{...field} 
												className="h-12 rounded-md border border-ink/40 bg-paper text-base focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0" 
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button 
								type="submit" 
								className="h-12 w-full text-base"
							>
								비밀번호 재설정
							</Button>
						</form>
					</Form>

						{/* 로그인 링크 */}
						<div className="mt-8 text-center">
							<Link href="/login" className="text-sm font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">
								로그인으로 돌아가기
							</Link>
						</div>
				</Sheet>
			</main>
		</div>
	)
}
