/**
 * ⭐ Review Schema 컴포넌트 
 * AI 검색 최적화를 위한 리뷰/평점 구조화 데이터
 * Schema.org Review 표준 준수 (좋아요/댓글 기반)
 */

import type { Item } from '@/types/item'

// 리뷰 데이터 준비에 필요한 최소 속성들
type ReviewDataInput = {
  id?: string
  title?: string
  item_type?: string
  likes_count?: number
  comments_count?: number
  comments?: any[]
  username?: string
  display_name?: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user?: {
    username?: string
  }
}

interface ReviewSchemaProps {
  itemName: string
  itemType: 'Recipe' | 'BlogPosting'
  likesCount: number
  commentsCount: number
  comments?: Comment[]
  authorName: string
  itemUrl: string
}

export default function ReviewSchema({ 
  itemName, 
  itemType, 
  likesCount, 
  commentsCount, 
  comments = [], 
  authorName,
  itemUrl 
}: ReviewSchemaProps) {
  
  // 🔄 데이터 유효성 검사
  if (likesCount === 0 && commentsCount === 0) {
    return null // 리뷰가 없으면 Schema도 생성하지 않음
  }

  // ⭐ 좋아요 기반 평점 계산 (1-5점 척도)
  const calculateRating = (likes: number, comments: number): number => {
    // 기본 평점 4.0에서 시작
    let rating = 4.0
    
    // 좋아요가 많을수록 평점 상승 (최대 +1.0)
    if (likes > 0) {
      rating += Math.min(likes * 0.1, 1.0)
    }
    
    // 댓글이 많을수록 추가 점수 (최대 +0.5)
    if (comments > 0) {
      rating += Math.min(comments * 0.05, 0.5)
    }
    
    // 5.0을 넘지 않도록 제한
    return Math.min(rating, 5.0)
  }

  const rating = calculateRating(likesCount, commentsCount)

  // 📝 댓글을 개별 리뷰로 변환
  const reviewList = comments.slice(0, 5).map(comment => ({
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": comment.user?.username || "익명"
    },
    "reviewBody": comment.content,
    "datePublished": comment.created_at,
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "5", // 댓글은 긍정적 참여로 간주
      "bestRating": "5",
      "worstRating": "1"
    }
  }))

  // 🎯 전체 평점 데이터
  const aggregateRating = {
    "@type": "AggregateRating",
    "ratingValue": rating.toFixed(1),
    "reviewCount": commentsCount.toString(),
    "bestRating": "5",
    "worstRating": "1"
  }

  // 📊 메인 아이템 Schema (Recipe 또는 BlogPosting)
  const itemSchema = {
    "@context": "https://schema.org",
    "@type": itemType,
    "name": itemName,
    "author": {
      "@type": "Person", 
      "name": authorName
    },
    "url": itemUrl,
    ...(reviewList.length > 0 && {
      "review": reviewList
    }),
    "aggregateRating": aggregateRating,
    // 🎯 추가 상호작용 지표
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": likesCount
      },
      {
        "@type": "InteractionCounter", 
        "interactionType": "https://schema.org/CommentAction",
        "userInteractionCount": commentsCount
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(itemSchema, null, 2)
      }}
    />
  )
}

// 🎯 유틸리티 함수: 아이템 타입 결정
export const getItemType = (itemType: string): 'Recipe' | 'BlogPosting' => {
  return itemType === 'recipe' ? 'Recipe' : 'BlogPosting'
}

// 🎯 유틸리티 함수: 리뷰 데이터 준비
export const prepareReviewData = (item: ReviewDataInput) => {
  return {
    itemName: item.title || "스푸니 콘텐츠",
    itemType: getItemType(item.item_type || 'post'),
    likesCount: item.likes_count || 0,
    commentsCount: item.comments_count || 0,
    comments: item.comments || [],
    authorName: item.username || item.display_name || "익명",
    itemUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${item.item_type === 'recipe' ? 'recipes' : 'posts'}/${item.id}`
  }
}

/**
 * 💡 Review Schema 최적화 원칙:
 * 1. 실제 사용자 참여 데이터 기반 (좋아요/댓글)
 * 2. 합리적 평점 계산 알고리즘
 * 3. 개별 댓글을 리뷰로 구조화
 * 4. InteractionCounter로 소셜 신호 강화
 * 5. Google Rich Snippets에서 별점 표시 가능
 */