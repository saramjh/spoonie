/**
 * 🍳 레시피 상세 페이지 - 하이브리드 래퍼 패턴
 * 
 * 🎯 구조:
 * - 서버 컴포넌트: SEO 최적화된 메타데이터 생성
 * - 클라이언트 컴포넌트: 기존 SSA 아키텍처 완전 보존
 * 
 * 🛡️ 기존 기능 보호:
 * - SWR 캐싱, UnifiedCacheManager, 실시간 동기화 모두 유지
 */

import { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import RecipeDetailClient from './RecipeDetailClient'

interface Props {
  params: { id: string }
}

// 🎯 동적 메타데이터 생성 (기존 기능에 영향 없음)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createSupabaseServerClient()
    
    // 🔥 최소한의 데이터만 가져와서 메타데이터 생성 (성능 최적화)
    const { data: recipe, error } = await supabase
      .from('items')
      .select(`
        title, 
        description, 
        image_urls, 
        created_at,
        tags,
        cooking_time_minutes,
        servings,
        profiles!user_id(display_name, username)
      `)
      .eq('id', params.id)
      .eq('item_type', 'recipe')
      .eq('is_public', true)
      .single()

    if (error || !recipe) {
      // 🛡️ 에러 시 기본 메타데이터 (기존 기능에 영향 없음)
      return { 
        title: '레시피 - 스푸니',
        description: '맛있는 레시피를 공유하는 스푸니입니다.',
      }
    }

    const profileData = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles
    const authorName = profileData?.display_name || profileData?.username || '익명'
    const imageUrl = recipe.image_urls?.[0] || '/default-recipe.jpg'
    const cleanDescription = recipe.description?.replace(/\n/g, ' ').slice(0, 160) || '맛있는 레시피입니다.'
    
    // 🎯 SEO 최적화된 제목 생성
    const seoTitle = `${recipe.title} - ${authorName}님의 레시피 | 스푸니`
    
    // 🎯 추가 키워드 생성
    const keywords = [
      recipe.title,
      ...(recipe.tags || []),
      '레시피',
      '요리',
      '음식',
      authorName
    ].filter(Boolean).join(', ')

    return {
      title: seoTitle,
      description: cleanDescription,
      keywords,
      
      // 🎯 Open Graph 최적화 (소셜 공유)
      openGraph: {
        title: `${recipe.title} - 스푸니`,
        description: cleanDescription,
        images: [{ 
          url: imageUrl, 
          width: 1200, 
          height: 630,
          alt: `${recipe.title} - ${authorName}님의 레시피`
        }],
        type: 'article',
        authors: [authorName],
        publishedTime: recipe.created_at,
        section: '레시피',
        siteName: '스푸니',
      },
      
      // 🎯 Twitter Cards 최적화
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: cleanDescription,
        images: [imageUrl],
        creator: `@${profileData?.username || 'spoonie'}`,
      },
      
      // 🎯 검색 엔진 최적화
      robots: {
        index: true,
        follow: true,
        googleBot: {
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      },
      
      // 🎯 정규 URL 설정
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/recipes/${params.id}`,
      },
      
      // 🎯 구조화 데이터 힌트
      other: {
        ...(recipe.cooking_time_minutes && { 'recipe:cooking_time': `${recipe.cooking_time_minutes}분` }),
        ...(recipe.servings && { 'recipe:servings': `${recipe.servings}인분` }),
      },
    }
  } catch (error) {
    // 🛡️ 에러 로깅 및 안전한 fallback
    console.error('❌ Recipe metadata generation failed:', error)
    return { 
      title: '레시피 - 스푸니',
      description: '맛있는 레시피를 공유하는 스푸니입니다.',
    }
  }
}

// 🎯 기존 클라이언트 컴포넌트를 그대로 래핑 (100% 기능 보존)
export default function RecipeDetailPage({ params }: Props) {
  return <RecipeDetailClient params={params} />
}
