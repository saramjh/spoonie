"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

import { generateUniqueUsername } from "@/lib/username-generator"

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
		const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
			? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
			: `${window.location.origin}/auth/callback`
		
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
				title: "회원가입 성공!",
				description: "인증 메일을 확인 후 서비스를 이용해주세요.",
			})
			router.push("/login")
		}
	}

				return (
					<div className="min-h-screen flex flex-col items-center justify-start p-4 bg-gradient-to-br from-orange-50 via-white to-orange-50">
			{/* 🎨 토스 스타일 그라디언트 배경 */}
			{/* 📱 상단 여백 + 카드 컨테이너 */}
			<main className="w-full max-w-sm mx-auto pt-16 sm:pt-20">
				{/* 🏷️ 컴팩트한 브랜드 영역 */}
				<div className="text-center mb-6">
					<div className="inline-block bg-white border-2 border-orange-500 p-3 rounded-xl mb-4 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
						<Image src="/icon-only.svg" alt="Spoonie Logo" width={32} height={32} />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-1">Spoonie</h1>
					<p className="text-sm text-gray-600">요리의 즐거움, 한 스푼</p>
				</div>

				{/* 📋 회원가입 카드 */}
				<div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">

					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-5">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input 
												placeholder="이메일" 
												{...field} 
												className="h-14 text-base bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white focus:ring-0 rounded-2xl transition-all duration-200 shadow-sm focus:shadow-md" 
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
									<FormItem>
										<FormControl>
											<Input 
												type="password" 
												placeholder="비밀번호 (6자 이상)" 
												{...field} 
												className="h-14 text-base bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white focus:ring-0 rounded-2xl transition-all duration-200 shadow-sm focus:shadow-md" 
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
									<FormItem>
										<FormControl>
											<Input 
												type="password" 
												placeholder="비밀번호 확인" 
												{...field} 
												className="h-14 text-base bg-gray-50 border-2 border-gray-200 focus:border-orange-500 focus:bg-white focus:ring-0 rounded-2xl transition-all duration-200 shadow-sm focus:shadow-md" 
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button 
								type="submit" 
								className="w-full h-14 text-base font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
							>
								회원가입
							</Button>
						</form>
					</Form>

						{/* 📋 로그인 링크 */}
						<div className="mt-8 text-center">
							<span className="text-sm text-gray-600">이미 계정이 있으신가요? </span>
							<Link href="/login" className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors duration-200">
								로그인
							</Link>
						</div>

						{/* ⚖️ 법적 문서 링크 */}
						<div className="mt-6 text-center space-x-3">
							<Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200">
								개인정보처리방침
							</Link>
							<span className="text-xs text-gray-300">|</span>
							<Link href="/legal/terms" className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200">
								이용약관
							</Link>
							<span className="text-xs text-gray-300">|</span>
							<Link href="/legal/policy" className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200">
								운영정책
							</Link>
						</div>
				</div>
			</main>
		</div>
	)
}
