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
			<div className="min-h-screen flex flex-col items-center justify-start p-4 bg-gradient-to-br from-orange-50 via-white to-orange-50">
				{/* 🎨 토스 스타일 그라디언트 배경 */}
				{/* 📱 상단 여백 + 카드 컨테이너 */}
				<main className="w-full max-w-sm mx-auto pt-16 sm:pt-20">
					{/* 🏷️ 컴팩트한 브랜드 영역 */}
					<div className="text-center mb-6">
					<Link href="/" className="inline-block">
						<div className="inline-block bg-white border-2 border-orange-500 p-3 rounded-xl mb-4 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">
							<Image src="/icon-only.svg" alt="Spoonie Logo" width={32} height={32} />
						</div>
					</Link>
					<h1 className="text-2xl font-bold text-gray-900 mb-1">비밀번호 찾기</h1>
					<p className="text-sm text-gray-600">가입 시 사용한 이메일 주소를 입력해주세요.</p>
				</div>

				{/* 📋 비밀번호 찾기 카드 */}
				<div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input 
												placeholder="이메일 주소" 
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
								재설정 링크 보내기
							</Button>
						</form>
					</Form>

						{/* 📋 로그인 링크 */}
						<div className="mt-8 text-center">
							<Link href="/login" className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors duration-200">
								로그인으로 돌아가기
							</Link>
						</div>
				</div>
			</main>
		</div>
	)
}
