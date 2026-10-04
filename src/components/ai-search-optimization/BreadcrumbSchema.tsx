import { serializeJsonLd } from "@/shared/lib/json-ld"
/** Schema.org BreadcrumbList JSON-LD. */

interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[]
}

export default function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  if (!items || items.length === 0) {
    return null
  }

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
        __html: serializeJsonLd(breadcrumbSchema)
      }}
    />
  )
}

export const createBreadcrumbs = {
  home: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" }
  ],

  recipes: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "레시피", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/recipes` }
  ],

  recipeDetail: (recipeTitle: string, recipeId: string): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: recipeTitle, url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/recipes/${recipeId}` }
  ],

  postDetail: (postTitle: string, postId: string): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: postTitle, url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/posts/${postId}` }
  ],

  profile: (username: string, profileId: string): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "프로필", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/profile` },
    { name: username, url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/profile/${profileId}` }
  ],

  search: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "검색", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/search` }
  ],

  bookmarks: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "북마크", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/bookmarks` }
  ],

  notifications: (): BreadcrumbItem[] => [
    { name: "홈", url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr" },
    { name: "알림", url: `${process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"}/notifications` }
  ]
}
