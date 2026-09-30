/**
 * 👤 프로필 페이지 - 하이브리드 래퍼 패턴
 * 
 * 🎯 구조:
 * - 서버 컴포넌트: SEO 최적화된 메타데이터 생성  
 * - 클라이언트 컴포넌트: 기존 복잡한 프로필 로직 완전 보존
 * 
 * 🛡️ 기존 기능 보호:
 * - SSA, SWR 캐싱, 팔로우 시스템, 복잡한 상태 관리 모두 유지
 */

import { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ProfilePageClient from './ProfilePageClient'
import { fetchUserItems, fetchFollowCounts, type UserProfile } from '@/lib/profile-data'
import BreadcrumbSchema, { createBreadcrumbs } from '@/components/ai-search-optimization/BreadcrumbSchema'

interface Props {
  params: { id: string }
}

// 🎯 동적 메타데이터 생성 (기존 기능에 영향 없음)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const supabase = createSupabaseServerClient()
    
    // 🔥 최소한의 데이터만 가져와서 메타데이터 생성 (성능 최적화)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        public_id,
        display_name,
        username,
        avatar_url,
        profile_message,
        created_at,
        followers_count,
        following_count,
        posts_count
      `)
      .eq('public_id', params.id)
      .single()

    if (error || !profile) {
      // 🛡️ 에러 시 기본 메타데이터 (기존 기능에 영향 없음)
      return { 
        title: '프로필 - 스푸니',
        description: '요리를 사랑하는 사람들의 프로필을 확인해보세요.',
      }
    }

    const displayName = profile.username || '익명'
    const profileImageUrl = profile.avatar_url || '/default-avatar.jpg'
    
    // 🎯 프로필 설명 생성 (profile_message 우선, 없으면 통계 기반)
    let profileDescription = ''
    if (profile.profile_message) {
      profileDescription = profile.profile_message
        .replace(/\n/g, ' ')
        .slice(0, 160)
    } else {
      profileDescription = `${displayName}님의 프로필입니다. 팔로워 ${profile.followers_count || 0}명, 게시물 ${profile.posts_count || 0}개`
    }
    
    // 🎯 SEO 최적화된 제목 생성  
    const seoTitle = `${displayName} (@${profile.username || profile.public_id}) - 스푸니`
    
    // 🎯 키워드 생성
    const keywords = [
      displayName,
      profile.username,
      '프로필',
      '요리',
      '레시피',
      '스푸니',
      '요리 블로거'
    ].filter(Boolean).join(', ')

    return {
      title: seoTitle,
      description: profileDescription,
      keywords,
      
      // 🎯 Open Graph 최적화 (소셜 공유)
      openGraph: {
        title: `${displayName} - 스푸니`,
        description: profileDescription,
        images: [{ 
          url: profileImageUrl, 
          width: 400, 
          height: 400,
          alt: `${displayName}님의 프로필 사진`
        }],
        type: 'profile',
        siteName: '스푸니',
      },
      
      // 🎯 Twitter Cards 최적화
      twitter: {
        card: 'summary',
        title: seoTitle,
        description: profileDescription,
        images: [profileImageUrl],
        creator: `@${profile.username || 'spoonie'}`,
      },
      
      // 🎯 검색 엔진 최적화
      robots: {
        index: true,
        follow: true,
        googleBot: {
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      
      // 🎯 정규 URL 설정
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/profile/${params.id}`,
      },
      
      // 🎯 추가 프로필 정보
      other: {
        'profile:username': profile.username || profile.public_id,
        'profile:followers': profile.followers_count?.toString() || '0',
        'profile:posts': profile.posts_count?.toString() || '0',
        'profile:joined': new Date(profile.created_at).toISOString().split('T')[0],
      },
    }
  } catch (error) {
    // 🛡️ 에러 로깅 및 안전한 fallback
    console.error('❌ Profile metadata generation failed:', error)
    return { 
      title: '프로필 - 스푸니',
      description: '요리를 사랑하는 사람들의 프로필을 확인해보세요.',
    }
  }
}

// 서버에서 공개 프로필 데이터를 미리 조회해 초기 HTML에 프로필 내용을 포함시킨다.
// 로그인 사용자 기준 데이터(본인의 비공개 글, 좋아요 상태)는 클라이언트가 이어서 채운다.
// 존재하지 않는 프로필은 "not_found", 그 밖의 오류는 null(클라이언트에서 기존 방식으로 조회).
async function loadInitialProfileData(identifier: string) {
  try {
    const supabase = createSupabaseServerClient()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
    const [{ data: profile, error }, { data: { user } }] = await Promise.all([
      supabase.from('profiles').select('*').eq(isUUID ? 'id' : 'public_id', identifier).maybeSingle(),
      supabase.auth.getUser(),
    ])
    if (error) throw error
    if (!profile) return 'not_found' as const

    // 다른 사람의 프로필이면 로그인 사용자 기준으로 좋아요 상태를 계산해, 첫 화면부터 좋아요 표시가 정확하게 한다.
    // 본인 프로필은 비공개 글과 댓글 수 계산에 브라우저 전용 조회가 필요하므로 공개 데이터로 먼저 그리고 클라이언트가 보완한다.
    const viewerId = user && user.id !== profile.id ? user.id : undefined
    const [items, followCounts] = await Promise.all([
      fetchUserItems(profile.id, viewerId, supabase),
      fetchFollowCounts(profile.id, supabase),
    ])
    return { profile: profile as UserProfile, items, followCounts }
  } catch (error) {
    console.error('❌ Initial profile load error:', error)
    return null
  }
}

export default async function ProfilePage({ params }: Props) {
  const initial = await loadInitialProfileData(params.id)
  // loading.tsx가 먼저 스트리밍되므로 상태 코드는 200이며, Next가 noindex 메타 태그를 넣어 색인에서 제외한다
  if (initial === 'not_found') notFound()

  const breadcrumbs = initial?.profile.public_id
    ? createBreadcrumbs.profile(initial.profile.username, initial.profile.public_id)
    : createBreadcrumbs.home()

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <ProfilePageClient
        key={params.id}
        params={params}
        initialProfile={initial?.profile ?? null}
        initialItems={initial?.items ?? null}
        initialFollowCounts={initial?.followCounts ?? null}
      />
    </>
  )
}
