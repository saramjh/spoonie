/**
 * 🧭 BreadcrumbList Schema 컴포넌트 
 * AI 검색 최적화를 위한 사이트 네비게이션 구조화 데이터
 * Schema.org BreadcrumbList 표준 준수
 */

interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[]
}

export default function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  // 🔄 데이터 유효성 검사
  if (!items || items.length === 0) {
    return null
  }

  // 🧭 BreadcrumbList Schema 구조화 데이터
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbSchema, null, 2)
      }}
    />
  )
}

// 🎯 미리 정의된 Breadcrumb 경로들
export const createBreadcrumbs = {
  // 🏠 홈페이지
  home: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" }
  ],

  // 🍳 레시피 목록
  recipes: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "레시피", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/recipes` }
  ],

  // 🍳 레시피 상세
  recipeDetail: (recipeTitle: string, recipeId: string): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: recipeTitle, url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/recipes/${recipeId}` }
  ],

  // 📝 포스트 상세  
  postDetail: (postTitle: string, postId: string): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: postTitle, url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/posts/${postId}` }
  ],

  // 👤 프로필  
  profile: (username: string, profileId: string): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "프로필", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/profile` },
    { name: username, url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/profile/${profileId}` }
  ],

  // 🔍 검색
  search: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "검색", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/search` }
  ],

  // 🔖 북마크
  bookmarks: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "북마크", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/bookmarks` }
  ],

  // 🔔 알림
  notifications: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "알림", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/notifications` }
  ]
}

/**
 * 💡 BreadcrumbList Schema 최적화 원칙:
 * 1. position 필드로 계층 구조 명확화
 * 2. 절대 URL 사용으로 SEO 최적화
 * 3. 사용자 친화적 name 사용
 * 4. 일관된 네비게이션 구조 유지
 * 5. Google Search Console에서 Rich Snippets 확인 가능
 */