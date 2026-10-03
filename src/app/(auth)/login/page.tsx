"use client"

import Link from "next/link"
import { useHydrated } from "@/hooks/useHydrated"
import { useRouter } from "@/shared/lib/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { safeNextPath } from "@/shared/lib/safe-next-path"
import { Sheet } from "@/components/kit"

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

	// 로그인 성공 후 화면 이동 중, Google 로그인 페이지로 이동 중에도 버튼을 잠근다
	const [isRedirecting, setIsRedirecting] = useState(false)
	const [isGoogleRedirecting, setIsGoogleRedirecting] = useState(false)
	// 가입 화면으로 가도 돌아갈 곳(next)을 잃지 않게 한다
	// 주소는 화면이 뜬 뒤에 읽는다 (미리 만든 HTML과 어긋나지 않게)
	const hydrated = useHydrated()
	const next = hydrated ? new URLSearchParams(window.location.search).get("next") : null
	const signupHref = next ? `/signup?next=${encodeURIComponent(safeNextPath(next))}` : "/signup"
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
			setIsRedirecting(true)
			router.push(safeNextPath(new URLSearchParams(window.location.search).get("next")))
			router.refresh()
		}
	}

	const handleGoogleLogin = async () => {
		// 환경변수 우선, 없으면 현재 도메인 사용
		const next = safeNextPath(new URLSearchParams(window.location.search).get("next"))
		const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`
		const redirectUrl = next === "/" ? callbackUrl : `${callbackUrl}?next=${encodeURIComponent(next)}`
		
		// 디버깅용 로그 (개발 환경에서만)
		if (process.env.NODE_ENV === 'development') {
			console.log('🔍 OAuth Redirect URL:', redirectUrl)
			console.log('🔍 Environment NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
		}
		
		setIsGoogleRedirecting(true)
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: redirectUrl,
				queryParams: {
					prompt: "select_account",
				},
			},
		})
		if (error) {
			setIsGoogleRedirecting(false)
			toast({
				title: "로그인 실패",
				description: "Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.",
				variant: "destructive",
			})
		}
	}

				return (
					<div className="min-h-screen flex flex-col items-center justify-start p-4">
			{/* 토스 스타일 그라디언트 배경 */}
			{/* 상단 여백 + 카드 컨테이너 */}
			<main className="w-full max-w-sm mx-auto pt-8">
				{/* 컴팩트한 브랜드 영역 */}
				<div className="text-center mb-6">
					<h1 className="text-title text-ink">로그인</h1>
				</div>

				{/* 로그인 카드 */}
				<Sheet className="p-6">

					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleLogin)} className="space-y-5">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="space-y-1.5">
										<FormLabel className="text-label font-medium text-ink">이메일</FormLabel>
										<FormControl>
											{/* 토스 스타일 입력필드 */}
											<Input 
												 
												{...field}  
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
										<FormLabel className="text-label font-medium text-ink">비밀번호</FormLabel>
										<FormControl>
											<Input 
												type="password" 
												 
												{...field}  
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{/* 토스 스타일 로그인 버튼 */}
							<Button 
								type="submit" 
								disabled={form.formState.isSubmitting || isRedirecting}
								className="h-12 w-full text-body"
							>
								{form.formState.isSubmitting || isRedirecting ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
										로그인 중
									</>
								) : "로그인"}
							</Button>
						</form>
					</Form>

						{/* 비밀번호 찾기 링크 */}
						<div className="text-center mt-4 mb-6">
							<Link href="/forgot-password" className="text-meta text-ink-soft hover:text-orange-ink transition-colors duration-200">
								비밀번호를 잊으셨나요?
							</Link>
						</div>

						{/* 구분선 */}
						<div className="relative my-6">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t border-border" />
							</div>
							<div className="relative flex justify-center text-meta">
								<span className="bg-paper px-4 text-ink-soft font-medium">또는</span>
							</div>
						</div>

						{/* 소셜 로그인 */}
						<Button 
							variant="outline" 
							className="h-12 w-full text-body" 
							onClick={handleGoogleLogin}
							disabled={isGoogleRedirecting}
						>
							{isGoogleRedirecting ? (
								<Loader2 className="mr-3 h-5 w-5 animate-spin" aria-hidden="true" />
							) : (
								<GoogleIcon className="mr-3" />
							)}
							Google로 계속하기
						</Button>
				</Sheet>

				{/* 회원가입 링크 */}
				<div className="mt-8 text-center">
					<span className="text-meta text-ink-soft">계정이 없으신가요? </span>
					<Link href={signupHref} className="text-label font-semibold text-orange-ink hover:text-orange-ink transition-colors duration-200">
						회원가입
					</Link>
				</div>

				{/* 법적 문서 링크 */}
				<div className="mt-6 text-center space-x-3">
					<Link href="/legal/privacy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">
						개인정보처리방침
					</Link>
					<span className="text-meta text-ink-soft/60">|</span>
					<Link href="/legal/terms" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">
						이용약관
					</Link>
					<span className="text-meta text-ink-soft/60">|</span>
					<Link href="/legal/policy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">
						운영정책
					</Link>
				</div>
			</main>
		</div>
	)
}
