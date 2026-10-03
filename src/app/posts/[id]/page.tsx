/**
 * 포스트 상세 페이지 - 하이브리드 래퍼 패턴
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
import { fetchItemDetail, ItemNotFoundError } from '@/features/feed/data/item-detail'
import PostDetailClient from './PostDetailClient'
import PostSchema from '@/components/ai-search-optimization/PostSchema'
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
    const { data: post, error } = await supabase
      .from('items')
      .select(`
        title, 
        description, 
        content,
        image_urls, 
        created_at,
        tags,
        profiles!user_id(display_name, username)
      `)
      .eq('id', params.id)
      .eq('item_type', 'post')
      .eq('is_public', true)
      .single()

    if (error || !post) {
      // 에러 시 기본 메타데이터 (기존 기능에 영향 없음)
      return { 
        title: '레시피드 - Spoonie',
        description: '요리와 관련된 이야기를 공유하는 Spoonie입니다.',
        robots: { index: false, follow: true }, // 공개 글이 아니거나 없는 주소
      }
    }

    const profileData = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    const authorName = profileData?.username || '익명'
    const imageUrl = post.image_urls?.[0] || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`
    
    // 설명 생성 (description 우선, 없으면 content에서 추출)
    let cleanDescription = ''
    if (post.description) {
      cleanDescription = post.description.replace(/\n/g, ' ').slice(0, 160)
    } else if (post.content) {
      // content에서 텍스트만 추출하여 설명 생성
      cleanDescription = post.content
        .replace(/<[^>]*>/g, '') // HTML 태그 제거
        .replace(/\n/g, ' ')     // 줄바꿈을 공백으로
        .trim()
        .slice(0, 160)
    }
    
    if (!cleanDescription) {
      cleanDescription = '요리와 관련된 흥미로운 이야기입니다.'
    }
    
    // SEO 최적화된 제목 생성
    const seoTitle = `${post.title} - ${authorName}님의 레시피드 | Spoonie`
    
    // 추가 키워드 생성
    const keywords = [
      post.title,
      ...(post.tags || []),
      '레시피드',
      '요리 이야기',
      '음식',
      '일상',
      authorName
    ].filter(Boolean).join(', ')

    return {
      title: seoTitle,
      description: cleanDescription,
      keywords,
      
      // Open Graph 최적화 (소셜 공유)
      openGraph: {
        title: `${post.title} - Spoonie`,
        description: cleanDescription,
        images: [{ 
          url: imageUrl, 
          width: 1200, 
          height: 630,
          alt: `${post.title} - ${authorName}님의 레시피드`
        }],
        type: 'article',
        authors: [authorName],
        publishedTime: post.created_at,
        section: '레시피드',
        siteName: 'Spoonie',
      },
      
      // Twitter Cards 최적화
      twitter: {
        card: 'summary_large_image',
        title: seoTitle,
        description: cleanDescription,
        images: [imageUrl],
        creator: `@${profileData?.username || 'spoonie'}`,
      },
      
      // 검색 유입의 착지는 레시피가 맡는다 (docs/discovery-and-behavior.md). 레시피드는 짧은 활동 기록이라
      // 색인하지 않고, 안의 링크(출처 레시피, 작성자)만 따라가게 한다. 공유 미리보기는 그대로 쓴다.
      robots: { index: false, follow: true },
      
      // 정규 URL 설정
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/posts/${params.id}`,
      },
      
      // Article Schema 힌트
      other: {
        'article:author': authorName,
        'article:section': '레시피드',
        'article:tag': post.tags?.join(', ') || '',
      },
    }
  } catch (error) {
    // 에러 로깅 및 안전한 fallback
    console.error('❌ Post metadata generation failed:', error)
    return { 
      title: '레시피드 - Spoonie',
      description: '요리와 관련된 이야기를 공유하는 Spoonie입니다.',
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

export default async function PostDetailPage(props: Props) {
  const params = await props.params;
  if (!UUID.test(params.id)) notFound()
  const initialItem = await loadInitialItem(params.id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
  const breadcrumbs = initialItem?.title
    ? createBreadcrumbs.postDetail(initialItem.title, params.id)
    : createBreadcrumbs.home()

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      {initialItem && <PostSchema item={initialItem} baseUrl={baseUrl} />}
      <PostDetailClient params={params} initialItem={initialItem} />
    </>
  )
}
