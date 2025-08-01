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

const formSchema = z.object({
	email: z.string().email({ message: "올바른 이메일을 입력해주세요." }),
	password: z.string().min(1, { message: "비밀번호를 입력해주세요." }),
})

const GoogleIcon = (props: React.ComponentProps<"svg">) => (
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
		<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
		<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
		<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
		<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
	</svg>
)

export default function LoginPage() {
	const router = useRouter()
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	})

	const handleLogin = async (values: z.infer<typeof formSchema>) => {
		const { error } = await supabase.auth.signInWithPassword({
			email: values.email,
			password: values.password,
		})

		if (error) {
			toast({
				title: "로그인 실패",
				description: "이메일 또는 비밀번호를 확인해주세요.",
				variant: "destructive",
			})
		} else {
			router.push("/")
			router.refresh()
		}
	}

	const handleGoogleLogin = async () => {
		// 🎯 환경변수 우선, 없으면 현재 도메인 사용
		const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
			? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
			: `${window.location.origin}/auth/callback`
		
		// 🔍 디버깅용 로그 (임시)
		console.log('🔍 OAuth Redirect URL:', redirectUrl)
		console.log('🔍 Environment NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
		
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: redirectUrl,
				queryParams: {
					prompt: "select_account",
				},
			},
		})
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
					<form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
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
						<Button type="submit" className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600  rounded-xl">
							로그인
						</Button>
					</form>
				</Form>

				<div className="text-center my-4">
					<Link href="/forgot-password" legacyBehavior>
						<a className="text-sm text-gray-600 hover:underline">비밀번호를 잊으셨나요?</a>
					</Link>
				</div>

				<div className="relative my-6">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="bg-white px-2 text-muted-foreground">또는</span>
					</div>
				</div>

				<div className="space-y-3">
					<Button variant="outline" className="w-full h-12 text-base rounded-xl" onClick={handleGoogleLogin}>
						<GoogleIcon className="mr-2" />
						Google로 계속하기
					</Button>
				</div>

				<p className="mt-8 text-sm text-center text-gray-600">
					계정이 없으신가요?{" "}
					<Link href="/signup" legacyBehavior>
						<a className="font-semibold text-orange-500 hover:text-orange-600 hover:underline">회원가입</a>
					</Link>
				</p>
			</main>
		</div>
	)
}
