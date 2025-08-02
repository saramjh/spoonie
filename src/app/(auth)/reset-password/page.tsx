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
					<h1 className="text-2xl font-bold text-gray-900 mb-1">새 비밀번호 설정</h1>
					<p className="text-sm text-gray-600">새로운 비밀번호를 입력해주세요.</p>
				</div>

				{/* 📋 비밀번호 재설정 카드 */}
				<div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input 
												type="password" 
												placeholder="새 비밀번호 (6자 이상)" 
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
												placeholder="새 비밀번호 확인" 
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
								비밀번호 재설정
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
