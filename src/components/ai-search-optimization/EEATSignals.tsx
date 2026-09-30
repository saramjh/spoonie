import { serializeJsonLd } from "@/lib/json-ld"
/**
 * 🤖 E-E-A-T 신호 컴포넌트
 * AI 검색을 위한 전문성, 권위성, 신뢰성 신호
 */

interface AuthorExpertise {
  name: string
  credentials?: string[]
  experience?: string
  specialization?: string[]
  socialProof?: {
    followersCount?: number
    recipesCount?: number
    averageRating?: number
  }
}

interface EEATSignalsProps {
  author: AuthorExpertise
  content: {
    type: 'recipe' | 'post'
    title: string
    publishDate: string
    lastModified?: string
    sources?: string[]
    factChecked?: boolean
  }
  organization?: {
    name: string
    description: string
    url: string
  }
}

export default function EEATSignals({ author, content, organization }: EEATSignalsProps) {
  // Person Schema for Author
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": author.name,
    ...(author.credentials && { "hasCredential": author.credentials }),
    ...(author.experience && { "description": author.experience }),
    ...(author.specialization && { "knowsAbout": author.specialization }),
    ...(author.socialProof && {
      "interactionStatistic": [
        {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/FollowAction", 
          "userInteractionCount": author.socialProof.followersCount || 0
        }
      ]
    })
  }

  // Organization Schema
  const organizationSchema = organization ? {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": organization.name,
    "description": organization.description,
    "url": organization.url,
    "trustworthiness": "verified"
  } : null

  // Review/Rating Schema (for recipes)
  const reviewSchema = content.type === 'recipe' && author.socialProof?.averageRating ? {
    "@context": "https://schema.org",
    "@type": "Review",
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": author.socialProof.averageRating,
      "bestRating": "5"
    },
    "author": {
      "@type": "Person",
      "name": author.name
    }
  } : null

  return (
    <>
      {/* Author Person Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(personSchema)
        }}
      />

      {/* Organization Schema */}
      {organizationSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(organizationSchema)
          }}
        />
      )}

      {/* Review Schema */}
      {reviewSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(reviewSchema)
          }}
        />
      )}

      {/* E-E-A-T Signals in HTML */}
      <div className="hidden" itemScope itemType="https://schema.org/Article">
        <meta itemProp="author" content={author.name} />
        <meta itemProp="datePublished" content={content.publishDate} />
        {content.lastModified && (
          <meta itemProp="dateModified" content={content.lastModified} />
        )}
        {content.factChecked && (
          <meta itemProp="reviewedBy" content="Editorial Team" />
        )}
        {author.credentials?.map((credential, index) => (
          <meta key={index} itemProp="author.hasCredential" content={credential} />
        ))}
      </div>
    </>
  )
}

// 스푸니 플랫폼 신뢰성 신호
export const spoonieOrganization = {
  name: "스푸니 (Spoonie)",
  description: "레시피 공유와 요리 커뮤니티 플랫폼. 검증된 요리사와 요리 애호가들이 함께 만드는 신뢰할 수 있는 레시피 정보.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
}

// 일반적인 요리 전문성 카테고리
export const cookingExpertiseCategories = [
  "한식 요리",
  "양식 요리", 
  "중식 요리",
  "일식 요리",
  "베이킹",
  "디저트",
  "비건 요리",
  "다이어트 요리",
  "홈쿠킹",
  "레시피 개발"
]