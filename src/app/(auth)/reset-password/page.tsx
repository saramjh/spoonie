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
		<div className="flex flex-col items-center justify-center py-16 bg-white p-4">
			<main className="w-full max-w-sm mx-auto">
				<div className="text-center mb-6">
					<Link href="/" className="inline-block">
						<div className="inline-block bg-white border-2 border-orange-500 p-4 rounded-2xl mb-4 shadow-bauhaus hover:shadow-bauhaus-lg transition-all duration-300 transform hover:scale-105">
							<Image src="/icon-only.svg" alt="Spoonie Logo" width={40} height={40} />
						</div>
					</Link>
					<h1 className="text-3xl font-bold text-gray-900">새 비밀번호 설정</h1>
					<p className="text-gray-500 mt-2">새로운 비밀번호를 입력해주세요.</p>
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input type="password" placeholder="새 비밀번호" {...field} className="h-12 text-base bg-gray-50 border-gray-200 focus-visible:bg-white rounded-xl" />
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
										<Input type="password" placeholder="새 비밀번호 확인" {...field} className="h-12 text-base bg-gray-50 border-gray-200 focus-visible:bg-white rounded-xl" />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 rounded-xl">
							비밀번호 재설정
						</Button>
					</form>
				</Form>

				<p className="mt-8 text-sm text-center text-gray-600">
					<Link href="/login" legacyBehavior>
						<a className="font-semibold text-orange-500 hover:text-orange-600 hover:underline">로그인으로 돌아가기</a>
					</Link>
				</p>
			</main>
		</div>
	)
}
