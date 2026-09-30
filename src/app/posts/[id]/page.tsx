/**
 * 📝 포스트 상세 페이지 - 하이브리드 래퍼 패턴
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
import { notFound } from 'next/navigation'
import { fetchItemDetail, ItemNotFoundError } from '@/lib/item-detail'
import PostDetailClient from './PostDetailClient'
import PostSchema from '@/components/ai-search-optimization/PostSchema'
import BreadcrumbSchema, { createBreadcrumbs } from '@/components/ai-search-optimization/BreadcrumbSchema'

interface Props {
  params: { id: string }
}

// 🎯 동적 메타데이터 생성 (기존 기능에 영향 없음)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createSupabaseServerClient()
    
    // 🔥 최소한의 데이터만 가져와서 메타데이터 생성 (성능 최적화)
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
      // 🛡️ 에러 시 기본 메타데이터 (기존 기능에 영향 없음)
      return { 
        title: '레시피드 - 스푸니',
        description: '요리와 관련된 이야기를 공유하는 스푸니입니다.',
      }
    }

    const profileData = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    const authorName = profileData?.username || '익명'
    const imageUrl = post.image_urls?.[0] || '/default-post.jpg'
    
    // 🎯 설명 생성 (description 우선, 없으면 content에서 추출)
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
    
    // 🎯 SEO 최적화된 제목 생성
    const seoTitle = `${post.title} - ${authorName}님의 레시피드 | 스푸니`
    
    // 🎯 추가 키워드 생성
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
      
      // 🎯 Open Graph 최적화 (소셜 공유)
      openGraph: {
        title: `${post.title} - 스푸니`,
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
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/posts/${params.id}`,
      },
      
      // 🎯 Article Schema 힌트
      other: {
        'article:author': authorName,
        'article:section': '레시피드',
        'article:tag': post.tags?.join(', ') || '',
      },
    }
  } catch (error) {
    // 🛡️ 에러 로깅 및 안전한 fallback
    console.error('❌ Post metadata generation failed:', error)
    return { 
      title: '레시피드 - 스푸니',
      description: '요리와 관련된 이야기를 공유하는 스푸니입니다.',
    }
  }
}

// 서버에서 상세 데이터를 미리 조회해 초기 HTML에 본문을 포함시킨다.
// 존재하지 않거나 접근할 수 없는 항목은 "not_found", 그 밖의 오류는 null(클라이언트에서 재시도).
async function loadInitialItem(itemId: string) {
  try {
    return await fetchItemDetail(createSupabaseServerClient(), itemId)
  } catch (error) {
    if (error instanceof ItemNotFoundError) return "not_found" as const
    console.error("❌ Initial item load error:", error)
    return null
  }
}

export default async function PostDetailPage({ params }: Props) {
  const initialItem = await loadInitialItem(params.id)
  // loading.tsx가 먼저 스트리밍되므로 상태 코드는 200이며, Next가 noindex 메타 태그를 넣어 색인에서 제외한다
  if (initialItem === "not_found") notFound()

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
