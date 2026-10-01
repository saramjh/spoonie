"use client"

import Link from "next/link"
import { useRouter } from "@/lib/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { safeNextPath } from "@/lib/safe-next-path"

import { generateUniqueUsername } from "@/lib/username-generator"
import { Sheet } from "@/components/kit"

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

	// 가입 성공 후 로그인 화면으로 이동하는 동안에도 버튼을 잠근다
	const [isRedirecting, setIsRedirecting] = useState(false)
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
			confirmPassword: "",
		},
	})

	const handleSignUp = async (values: z.infer<typeof formSchema>) => {
		const username = await generateUniqueUsername()
		// 가입 전 보던 곳(예: 만들었어요 작성 화면)으로 인증 메일 링크와 로그인 화면이 이어지게 한다
		const next = safeNextPath(new URLSearchParams(window.location.search).get("next"))
		const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`
		const redirectUrl = next === "/" ? callbackUrl : `${callbackUrl}?next=${encodeURIComponent(next)}`
		
		const { error } = await supabase.auth.signUp({
			email: values.email,
			password: values.password,
			options: {
				emailRedirectTo: redirectUrl,
				data: {
					username,
				},
			},
		})

		if (error) {
			toast({
				title: "회원가입 실패",
				description: error.message,
				variant: "destructive",
			})
		} else {
			toast({
				title: "가입 신청이 끝났어요",
				description: "보내 드린 인증 메일의 링크를 누르면 로그인할 수 있어요.",
			})
			setIsRedirecting(true)
			router.push(next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`)
		}
	}

				return (
					<div className="min-h-screen flex flex-col items-center justify-start p-4">
			{/* 토스 스타일 그라디언트 배경 */}
			{/* 상단 여백 + 카드 컨테이너 */}
			<main className="w-full max-w-sm mx-auto pt-8">
				{/* 컴팩트한 브랜드 영역 */}
				<div className="text-center mb-6">
					<h1 className="text-[22px] font-bold text-ink">회원가입</h1>
				</div>

				{/* 회원가입 카드 */}
				<Sheet className="p-6">

					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-5">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-sm font-medium text-ink">이메일</FormLabel>
										<FormControl>
											<Input 
												 
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
								name="password"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-sm font-medium text-ink">비밀번호</FormLabel>
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
										<FormLabel className="text-sm font-medium text-ink">비밀번호 확인</FormLabel>
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
								disabled={form.formState.isSubmitting || isRedirecting}
								className="h-12 w-full text-base"
							>
								{form.formState.isSubmitting || isRedirecting ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
										가입하는 중
									</>
								) : "회원가입"}
							</Button>
						</form>
					</Form>

						{/* 로그인 링크 */}
						<div className="mt-8 text-center">
							<span className="text-sm text-ink-soft">이미 계정이 있으신가요? </span>
							<Link href="/login" className="text-sm font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">
								로그인
							</Link>
						</div>

						{/* 법적 문서 링크 */}
						<div className="mt-6 text-center space-x-3">
							<Link href="/legal/privacy" className="text-[13px] text-ink-soft hover:text-ink transition-colors duration-200">
								개인정보처리방침
							</Link>
							<span className="text-[13px] text-ink-soft/60">|</span>
							<Link href="/legal/terms" className="text-[13px] text-ink-soft hover:text-ink transition-colors duration-200">
								이용약관
							</Link>
							<span className="text-[13px] text-ink-soft/60">|</span>
							<Link href="/legal/policy" className="text-[13px] text-ink-soft hover:text-ink transition-colors duration-200">
								운영정책
							</Link>
						</div>
				</Sheet>
			</main>
		</div>
	)
}
