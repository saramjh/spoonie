"use client"

import Image from "next/image"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { createSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
	email: z.string().email({ message: "올바른 이메일 주소를 입력해주세요." }),
})

export default function ForgotPasswordPage() {
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	})

	const onSubmit = async (values: z.infer<typeof formSchema>) => {
		const redirectUrl = process.env.NEXT_PUBLIC_APP_URL 
			? `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`
			: `${window.location.origin}/reset-password`
		
		const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
			redirectTo: redirectUrl,
		})

		if (error) {
			toast({
				title: "오류",
				description: "비밀번호 재설정 요청에 실패했습니다. 잠시 후 다시 시도해주세요.",
				variant: "destructive",
			})
		} else {
			toast({
				title: "성공",
				description: "비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.",
			})
			form.reset()
		}
	}

	return (
		<div className="flex flex-col items-center justify-center py-16 bg-white p-4">
			<main className="w-full max-w-sm mx-auto">
				<div className="text-center mb-6">
					<Link href="/" className="inline-block">
						<div className="inline-block bg-white border-2 border-orange-500 p-4 rounded-2xl mb-4 shadow-bauhaus hover:shadow-bauhaus-lg transition-all duration-300 transform hover:scale-105">
							<Image src="/icon-only.svg" alt="Spoonie Logo" width={40} height={40} />
						</div>
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">비밀번호 찾기</h1>
					<p className="text-gray-500 mt-2">가입 시 사용한 이메일 주소를 입력해주세요.</p>
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
						<Button type="submit" className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 rounded-xl">
							재설정 링크 보내기
						</Button>
					</form>
				</Form>

				<p className="mt-6 text-sm text-center text-gray-600">
					<Link href="/login" legacyBehavior>
						<a className="font-semibold text-orange-500 hover:text-orange-600 hover:underline">로그인으로 돌아가기</a>
					</Link>
				</p>
			</main>
		</div>
	)
}
