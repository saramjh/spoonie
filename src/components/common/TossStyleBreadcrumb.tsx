/**
 * 🎨 토스 스타일 브레드크럼 네비게이션
 * 토스 UX/UI 디자인 철학 적용:
 * 
 * 1. 미니멀하면서도 정보가 명확한 네비게이션
 * 2. 한국 사용자에게 친숙한 패턴 (홈 > 카테고리 > 상세)
 * 3. 터치 친화적인 크기와 간격
 * 4. SEO 친화적인 구조화 데이터 포함
 */

"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { usePathname } from "next/navigation"

interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
}

interface TossStyleBreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

// 🎨 토스 스타일 자동 브레드크럼 생성
const generateBreadcrumbFromPath = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: '홈', href: '/' }
  ]

  // 경로별 브레드크럼 매핑
  const pathMap: Record<string, string> = {
    'recipes': '레시피',
    'posts': '레시피드', 
    'search': '검색',
    'profile': '프로필',
    'new': '작성하기',
    'edit': '수정하기'
  }

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1
    const isId = /^[a-zA-Z0-9\-_]+$/.test(segment) && segments[index - 1] // ID 패턴 감지
    
    if (isId) {
      // ID는 "상세보기"로 표시
      breadcrumbs.push({
        label: segments[index - 1] === 'recipes' ? '레시피 상세' : '레시피드 상세',
        href: isLast ? undefined : `/${segments.slice(0, index + 1).join('/')}`,
        isCurrentPage: isLast
      })
    } else {
      const label = pathMap[segment] || segment
      breadcrumbs.push({
        label,
        href: isLast ? undefined : `/${segments.slice(0, index + 1).join('/')}`,
        isCurrentPage: isLast
      })
    }
  })

  return breadcrumbs
}

export default function TossStyleBreadcrumb({ 
  items, 
  className = "",
  showHome = true 
}: TossStyleBreadcrumbProps) {
  const pathname = usePathname()
  
  // 자동 생성 또는 수동 전달된 items 사용
  const breadcrumbItems = items || generateBreadcrumbFromPath(pathname)
  
  // 홈페이지에서는 브레드크럼 숨김
  if (pathname === '/' || breadcrumbItems.length <= 1) {
    return null
  }

  // SEO를 위한 구조화 데이터 생성
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      ...(item.href && { "item": `${process.env.NEXT_PUBLIC_APP_URL}${item.href}` })
    }))
  }

  return (
    <>
      {/* SEO 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData, null, 2)
        }}
      />
      
      {/* 🎨 토스 스타일 브레드크럼 UI */}
      <nav 
        className={`bg-white border-b border-gray-100 ${className}`}
        aria-label="브레드크럼 네비게이션"
      >
        <div className="max-w-md mx-auto px-4 py-3">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbItems.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {/* 구분자 (첫 번째 제외) */}
                {index > 0 && (
                  <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                )}
                
                {/* 브레드크럼 아이템 */}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 text-gray-600 hover:text-orange-500 transition-colors py-1 px-2 rounded-lg hover:bg-orange-50"
                  >
                    {index === 0 && showHome && (
                      <Home className="w-3 h-3" />
                    )}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ) : (
                  <span 
                    className="flex items-center gap-1 text-gray-900 font-semibold py-1 px-2"
                    aria-current="page"
                  >
                    {index === 0 && showHome && (
                      <Home className="w-3 h-3" />
                    )}
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  )
}

// 🎨 토스 스타일 커스텀 브레드크럼 헬퍼
export const createCustomBreadcrumb = {
  recipe: (recipeTitle: string, _recipeId: string): BreadcrumbItem[] => [
    { label: '홈', href: '/' },
    { label: '레시피', href: '/recipes' },
    { label: recipeTitle, isCurrentPage: true }
  ],
  
  post: (postTitle: string, _postId: string): BreadcrumbItem[] => [
    { label: '홈', href: '/' },
    { label: '레시피드', href: '/posts' },
    { label: postTitle, isCurrentPage: true }
  ],
  
  profile: (username: string): BreadcrumbItem[] => [
    { label: '홈', href: '/' },
    { label: `${username}님의 프로필`, isCurrentPage: true }
  ],
  
  search: (query?: string): BreadcrumbItem[] => [
    { label: '홈', href: '/' },
    { label: query ? `"${query}" 검색 결과` : '검색', isCurrentPage: true }
  ]
}