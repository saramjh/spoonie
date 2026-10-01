/**
 * 프로필 페이지 - 하이브리드 래퍼 패턴
 * 
 * 구조:
 * - 서버 컴포넌트: SEO 최적화된 메타데이터 생성  
 * - 클라이언트 컴포넌트: 기존 복잡한 프로필 로직 완전 보존
 * 
 * 기존 기능 보호:
 * - SSA, SWR 캐싱, 팔로우 시스템, 복잡한 상태 관리 모두 유지
 */

import { Metadata } from 'next'
import { createSupabasePublicClient } from '@/lib/supabase-public'
import { notFound } from 'next/navigation'
import ProfilePageClient from './ProfilePageClient'
import { fetchUserItems, fetchFollowCounts, PUBLIC_PROFILE_COLUMNS, type UserProfile } from '@/lib/profile-data'
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
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        public_id,
        display_name,
        username,
        avatar_url,
        profile_message,
        created_at
      `)
      .eq('public_id', params.id)
      .single()

    if (error || !profile) {
      // 에러 시 기본 메타데이터 (기존 기능에 영향 없음)
      return { 
        title: '프로필 - 스푸니',
        description: '요리를 사랑하는 사람들의 프로필을 확인해보세요.',
        robots: { index: false, follow: true }, // 없는 프로필
      }
    }

    // 공개 레시피가 있는 프로필만 색인한다 (빈 프로필은 검색 결과에서 얇은 페이지가 된다)
    const { count: publicRecipes } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('item_type', 'recipe')
      .eq('is_public', true)

    const displayName = profile.username || '익명'
    const profileImageUrl = profile.avatar_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`
    
    // 프로필 설명 생성 (profile_message 우선, 없으면 통계 기반)
    let profileDescription = ''
    if (profile.profile_message) {
      profileDescription = profile.profile_message
        .replace(/\n/g, ' ')
        .slice(0, 160)
    } else {
      profileDescription = `${displayName}님의 스푸니 프로필입니다. 레시피와 요리 이야기를 확인해보세요.`
    }
    
    // SEO 최적화된 제목 생성  
    const seoTitle = `${displayName} (@${profile.username || profile.public_id}) - 스푸니`
    
    // 키워드 생성
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
      
      // Open Graph 최적화 (소셜 공유)
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
      
      // Twitter Cards 최적화
      twitter: {
        card: 'summary',
        title: seoTitle,
        description: profileDescription,
        images: [profileImageUrl],
        creator: `@${profile.username || 'spoonie'}`,
      },
      
      // 검색 엔진 최적화
      robots: publicRecipes
        ? { index: true, follow: true, googleBot: { 'max-image-preview': 'large', 'max-snippet': -1 } }
        : { index: false, follow: true },
      
      // 정규 URL 설정
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_APP_URL}/profile/${params.id}`,
      },
      
      // 추가 프로필 정보
      other: {
        'profile:username': profile.username || profile.public_id,
        'profile:joined': new Date(profile.created_at).toISOString().split('T')[0],
      },
    }
  } catch (error) {
    // 에러 로깅 및 안전한 fallback
    console.error('❌ Profile metadata generation failed:', error)
    return { 
      title: '프로필 - 스푸니',
      description: '요리를 사랑하는 사람들의 프로필을 확인해보세요.',
    }
  }
}

// 공개 프로필은 첫 방문 때 만들어 CDN에 두고 10분마다 갱신한다 (프로필이나 글이 바뀌면 /api/revalidate로 즉시 갱신).
// 로그인 정보를 읽지 않으므로 방문마다 서버 함수가 실행되지 않는다. 본인의 비공개 글·좋아요 상태는 브라우저가 채운다.
export const revalidate = 600

export async function generateStaticParams() {
  return []
}

// 존재하지 않는 프로필은 "not_found", 그 밖의 오류는 null(클라이언트에서 기존 방식으로 조회).
async function loadInitialProfileData(identifier: string) {
  try {
    const supabase = createSupabasePublicClient()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
    const { data: profile, error } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq(isUUID ? 'id' : 'public_id', identifier).maybeSingle()
    if (error) throw error
    if (!profile) return 'not_found' as const
    const [items, followCounts] = await Promise.all([
      fetchUserItems(profile.id, undefined, supabase),
      fetchFollowCounts(profile.id, supabase),
    ])
    return { profile: profile as UserProfile, items, followCounts }
  } catch (error) {
    console.error('Initial profile load error:', error)
    return null
  }
}

export default async function ProfilePage(props: Props) {
  const params = await props.params;
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
