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
import PostDetailClient from './PostDetailClient'
import BreadcrumbSchema, { createBreadcrumbs } from '@/components/ai-search-optimization/BreadcrumbSchema'
import ReviewSchema, { prepareReviewData } from '@/components/ai-search-optimization/ReviewSchema'

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

// 📝 포스트 데이터 가져오기 (Schema용)
async function getPostForSchema(postId: string) {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data: post, error } = await supabase
      .from('items')
      .select(`
        id,
        title, 
        description, 
        content,
        image_urls, 
        created_at,
        tags,
        item_type,
        profiles!user_id(username)
      `)
      .eq('id', postId)
      .eq('item_type', 'post')
      .eq('is_public', true)
      .single()

    if (error || !post) {
      return null
    }

    // 🔄 프로필 데이터 변환
    const profileData = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles

    // 🔥 좋아요와 댓글 수 조회 (Review Schema용)
    const { data: socialData } = await supabase
      .from('items')
      .select(`
        id,
        likes_count:likes(count),
        comments_count:comments(count)
      `)
      .eq('id', postId)
      .single()

    return {
      id: post.id,
      title: post.title || '',
      description: post.description || '',
      content: post.content || '',
      image_urls: post.image_urls || [],
      created_at: post.created_at,
      tags: post.tags || [],
      item_type: post.item_type,
      username: profileData?.username || '',
      likes_count: socialData?.likes_count?.[0]?.count || 0,
      comments_count: socialData?.comments_count?.[0]?.count || 0
    }
  } catch (error) {
    console.error('❌ Post schema data loading error:', error)
    return null
  }
}

// 🎯 기존 클라이언트 컴포넌트를 그대로 래핑 + SEO Schema 추가 (100% 기능 보존)
export default async function PostDetailPage({ params }: Props) {
  // 🔥 SEO를 위한 Post Schema 데이터 가져오기
  const postForSchema = await getPostForSchema(params.id)

  // 🧭 Breadcrumb 경로 생성
  const breadcrumbs = postForSchema 
    ? createBreadcrumbs.postDetail(postForSchema.title, params.id)
    : createBreadcrumbs.home()

  return (
    <>
      {/* 🆕 SEO Schema 최적화 (기존 기능에 영향 없음) */}
      <BreadcrumbSchema items={breadcrumbs} />
      {postForSchema && (
        <ReviewSchema {...prepareReviewData(postForSchema)} />
      )}
      
      {/* 🛡️ 기존 클라이언트 컴포넌트 완전 보존 */}
      <PostDetailClient params={params} />
    </>
  )
}
