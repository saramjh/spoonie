import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "./src/lib/supabase"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabase = createSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	// 로그인한 사용자가 루트 또는 인증 페이지 접근 시 피드로 리다이렉션
  if (user) {
		if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup")) {
			return NextResponse.redirect(new URL("/feed", request.url))
    }
  }

	// 비회원이 접근할 수 없는 페이지들 (작성, 프로필, 알림 등)
	const authRequiredPaths = ["/profile", "/notifications", "/recipes/edit", "/feed/edit"]

	// 비회원이 작성/프로필/알림 페이지에 접근 시 로그인 페이지로 리디렉션
	if (!user && authRequiredPaths.some((path) => pathname.startsWith(path))) {
		return NextResponse.redirect(new URL("/login", request.url))
  }

	// 비회원도 접근 가능한 페이지들: 홈('/'), 피드('/feed'), 검색('/search'), 상세페이지('/recipes/[id]', '/feed/[id]'), 작성페이지('/recipes/new', '/posts/new')
	// 상세페이지와 작성페이지의 블러 처리는 클라이언트 컴포넌트에서 처리

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes)
     * - auth/ (auth routes)
     */
		"/((?!_next/static|_next/image|favicon.ico|api|auth).*)",
  ],
}
