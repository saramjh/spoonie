/**
 * 레시피 상세 페이지 - 하이브리드 래퍼 패턴
 * 
 * 구조:
 * - 서버 컴포넌트: SEO 최적화된 메타데이터 생성
 * - 클라이언트 컴포넌트: 기존 SSA 아키텍처 완전 보존
 * 
 * 기존 기능 보호:
 * - SWR 캐싱, UnifiedCacheManager, 실시간 동기화 모두 유지
 */

import { Metadata } from 'next'
import { createSupabasePublicClient } from '@/shared/infra/supabase-public'
import { notFound } from 'next/navigation'
import { formatCookingTime } from '@/features/recipe/domain/recipe-amount'
import { fetchItemDetail, ItemNotFoundError } from '@/features/feed/data/item-detail'
import RecipeDetailClient from './RecipeDetailClient'
import RecipeSchema from '@/components/ai-search-optimization/RecipeSchema'
import BreadcrumbSchema, { createBreadcrumbs } from '@/components/ai-search-optimization/BreadcrumbSchema'

interface Props {
  params: Promise<{ id: string }>
}

// 동적 메타데이터 생성 (기존 기능에 영향 없음)
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  try {
    const supabase = createSupabasePublicClient()
    
    // 최소한의 데이터만 가져와서 메타데이터 생성 (성능 최적화)
    const { data: recipe, error } = await supabase
      .from('items')
      .select(`
        title, 
        description, 
        image_urls, 
        thumbnail_index,
        created_at,
        tags,
        cooking_time_minutes,
        servings,
        profiles!user_id(display_name, username),
        ingredients(name, order_index)
      `)
      .eq('id', params.id)
      .eq('item_type', 'recipe')
      .eq('is_public', true)
      .single()

    if (error || !recipe) {
      // 에러 시 기본 메타데이터 (기존 기능에 영향 없음)
      return { 
        title: '레시피 - Spoonie',
        description: '맛있는 레시피를 공유하는 Spoonie입니다.',
        robots: { index: false, follow: true }, // 공개 글이 아니거나 없는 주소
      }
    }

    const profileData = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles
    const authorName = profileData?.username || '익명'
    // 공유 이미지: 작성자가 고른 대표 사진. 사진이 없으면 1200×630 기본 이미지
    const coverUrl = recipe.image_urls?.[recipe.thumbnail_index ?? 0] || recipe.image_urls?.[0]
    const imageUrl = coverUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`
    // 검색 결과 설명: 작성자의 소개 다음에 인분·조리 시간·재료 (레시피라는 정보가 한 줄에 보이게)
    const ingredientNames = [...(recipe.ingredients || [])].sort((a, b) => a.order_index - b.order_index).map((i) => i.name)
    const cookingTime = formatCookingTime(recipe.cooking_time_minutes)
    const facts = [
      recipe.servings ? `${recipe.servings}인분` : null,
      cookingTime ? `조리 ${cookingTime}` : null,
      ingredientNames.length ? `재료 ${ingredientNames.slice(0, 5).join(', ')}${ingredientNames.length > 5 ? ` 외 ${ingredientNames.length - 5}가지` : ''}` : null,
    ].filter(Boolean).join(' · ')
    const intro = recipe.description?.replace(/\n/g, ' ').trim()
    const cleanDescription = [intro, facts].filter(Boolean).join(' — ').slice(0, 160) || `${recipe.title} 레시피`
    
    // SEO 최적화된 제목 생성
    const seoTitle = `${recipe.title} - ${authorName}님의 레시피 | Spoonie`
    
    // 추가 키워드 생성
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
      
      // Open Graph 최적화 (소셜 공유)
      openGraph: {
        title: `${recipe.title} - Spoonie`,
        description: cleanDescription,
        images: [{ 
          url: imageUrl,
          // 실제 사진 크기는 제각각이라, 크기를 아는 기본 이미지일 때만 적는다
          ...(coverUrl ? {} : { width: 1200, height: 630 }),
          alt: `${recipe.title} - ${authorName}님의 레시피`
        }],
        type: 'article',
        authors: [authorName],
        publishedTime: recipe.created_at,
        section: '레시피',
        siteName: 'Spoonie',
      },
      
      // Twitter Cards 최적화
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: cleanDescription,
        images: [imageUrl],
      },
      
      // 검색 엔진 최적화
      robots: {
        index: true,
        follow: true,
        googleBot: {
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      },
      
      // 정규 URL 설정
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/recipes/${params.id}`,
      },
      
      // 구조화 데이터 힌트
      other: {
        ...(recipe.cooking_time_minutes && { 'recipe:cooking_time': `${recipe.cooking_time_minutes}분` }),
        ...(recipe.servings && { 'recipe:servings': `${recipe.servings}인분` }),
      },
    }
  } catch (error) {
    // 에러 로깅 및 안전한 fallback
    console.error('❌ Recipe metadata generation failed:', error)
    return { 
      title: '레시피 - Spoonie',
      description: '맛있는 레시피를 공유하는 Spoonie입니다.',
    }
  }
}

// 공개 글은 첫 방문 때 한 번 만들어 CDN에 두고 10분마다 갱신한다 (작성자가 고치면 /api/revalidate로 즉시 갱신).
// 로그인 정보를 읽지 않으므로 서버 함수가 방문마다 실행되지 않는다. 내 좋아요·저장 상태는 브라우저가 채운다.
export const revalidate = 600

export async function generateStaticParams() {
  return []
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 공개 데이터만 조회한다. 비공개 글이나 없는 글이면 null → 브라우저가 로그인 세션으로 다시 조회한다 (작성자는 자기 비공개 글을 본다)
async function loadInitialItem(itemId: string) {
  try {
    return await fetchItemDetail(createSupabasePublicClient(), itemId, { withViewer: false })
  } catch (error) {
    if (!(error instanceof ItemNotFoundError)) console.error("Initial item load error:", error)
    return null
  }
}

export default async function RecipeDetailPage(props: Props) {
  const params = await props.params;
  if (!UUID.test(params.id)) notFound()
  const initialItem = await loadInitialItem(params.id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
  const breadcrumbs = initialItem?.title
    ? createBreadcrumbs.recipeDetail(initialItem.title, params.id)
    : createBreadcrumbs.recipes()

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      {initialItem && <RecipeSchema item={initialItem} baseUrl={baseUrl} />}
      <RecipeDetailClient params={params} initialItem={initialItem} />
    </>
  )
}
