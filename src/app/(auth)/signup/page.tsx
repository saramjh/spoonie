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
		const envUrl = process.env.NEXT_PUBLIC_APP_URL
		
		// 🎯 강제로 프로덕션 도메인 사용
		const redirectUrl = location.hostname === 'spoonie.kr' || location.hostname === 'www.spoonie.kr'
			? `https://spoonie.kr/auth/callback`
			: envUrl 
				? `${envUrl}/auth/callback`
				: `${location.origin}/auth/callback`
		
		console.log('🔍 Signup Redirect Debug:', {
			hostname: location.hostname,
			envUrl,
			finalRedirectUrl: redirectUrl
		})
			
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
		<div className="flex flex-col items-center justify-center py-12 bg-white p-4">
			<main className="w-full max-w-sm mx-auto">
				<div className="text-center mb-6">
					<div className="inline-block bg-white border-2 border-orange-500 p-4 rounded-2xl mb-4 shadow-bauhaus hover:shadow-bauhaus-lg transition-all duration-300 transform hover:scale-105">
						<Image src="/icon-only.svg" alt="Spoonie Logo" width={40} height={40} />
					</div>
					<h1 className="text-3xl font-bold text-gray-900">Spoonie</h1>
					<p className="text-gray-500 mt-2">요리의 즐거움, 한 스푼</p>
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSignUp)} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input placeholder="이메일" {...field} className="h-12 text-base bg-gray-50 border-gray-200 focus-visible:bg-white rounded-xl" />
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
										<Input type="password" placeholder="비밀번호" {...field} className="h-12 text-base bg-gray-50 border-gray-200 focus-visible:bg-white rounded-xl" />
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
										<Input type="password" placeholder="비밀번호 확인" {...field} className="h-12 text-base bg-gray-50 border-gray-200 focus-visible:bg-white rounded-xl" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 rounded-xl">
							회원가입
						</Button>
					</form>
				</Form>

				<p className="mt-6 text-sm text-center text-gray-600">
					이미 계정이 있으신가요?{" "}
					<Link href="/login" legacyBehavior>
						<a className="font-semibold text-orange-500 hover:text-orange-600 hover:underline">로그인</a>
					</Link>
				</p>
			</main>
		</div>
	)
}
