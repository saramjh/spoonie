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
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48" {...props}>
		<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 9.92C34.553 6.08 29.613 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
		<path fill="#FF3D00" d="M6.306 14.691c-1.324 2.596-2.094 5.562-2.094 8.617s.77 6.021 2.094 8.617l-5.022 3.91c-2.04-3.786-3.272-8.14-3.272-12.527s1.232-8.741 3.272-12.527l5.022 3.91z" />
		<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-4.792-3.724c-2.033 1.366-4.61 2.168-7.617 2.168c-5.225 0-9.655-3.34-11.303-7.918l-5.022 3.91C9.562 39.922 16.227 44 24 44z" />
		<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.16-4.082 5.571l4.792 3.724c3.217-2.958 5.23-7.481 5.23-12.295c0-1.341-.138-2.65-.389-3.917z" />
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
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${location.origin}/auth/callback`,
				queryParams: {
					prompt: "select_account",
				},
			},
		})
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
			<main className="w-full max-w-sm mx-auto">
				<div className="text-center mb-8">
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
