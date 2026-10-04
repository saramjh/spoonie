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

import { serializeJsonLd } from "@/shared/lib/json-ld"
import { Metadata } from 'next'
import { createSupabasePublicClient } from '@/shared/infra/supabase-public'
import { notFound } from 'next/navigation'
import ProfilePageClient from './ProfilePageClient'
import { fetchUserItems, fetchFollowCounts, PUBLIC_PROFILE_COLUMNS, type UserProfile } from '@/features/profile/data/profile-repository'
import BreadcrumbSchema, { createBreadcrumbs } from '@/components/ai-search-optimization/BreadcrumbSchema'
import { hasSearchIndexableProfileContent, isSearchIndexableRecipeed } from '@/features/discovery/domain/search-exposure'

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
        title: '프로필 - Spoonie',
        description: '요리를 사랑하는 사람들의 프로필을 확인해보세요.',
        robots: { index: false, follow: true }, // 없는 프로필
      }
    }

    // 프로필은 레시피 또는 검색 가치가 있는 레시피드가 하나라도 있을 때 검색 자산이 된다.
    // 레시피드는 수동 플래그가 아니라 전 사이트 공통 자동 정책으로 판정한다.
    const [recipeCountResult, postCountResult, postsResult] = await Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('item_type', 'recipe').eq('is_public', true),
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('item_type', 'post').eq('is_public', true),
      supabase.from('items').select('title, content, tags, image_urls, cited_recipe_ids').eq('user_id', profile.id).eq('item_type', 'post').eq('is_public', true).limit(1000),
    ])
    const publicRecipes = recipeCountResult.count ?? 0
    const publicPosts = postCountResult.count ?? 0
    const searchablePosts = (postsResult.data ?? []).filter(isSearchIndexableRecipeed).length
    const hasSearchContent = hasSearchIndexableProfileContent(publicRecipes, searchablePosts)

    // 표시 이름이 있으면 그것을 (공식 계정 "Spoonie 주방"), 없으면 사용자 이름
    const displayName = profile.display_name || profile.username || '익명'
    const profileImageUrl = profile.avatar_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`
    
    // 프로필 설명 생성 (profile_message 우선, 없으면 통계 기반)
    let profileDescription = ''
    const intro = profile.profile_message
    if (intro) {
      profileDescription = `${intro.replace(/\n/g, ' ').slice(0, 120)} — 공개 레시피 ${publicRecipes}개 · 레시피드 ${publicPosts}개`
    } else {
      profileDescription = `${displayName}님이 Spoonie에 올린 공개 레시피 ${publicRecipes}개와 레시피드 ${publicPosts}개. 요리법과 음식·주방의 경험 기록을 볼 수 있어요.`
    }
    
    // SEO 최적화된 제목 생성  
    // 같은 이름을 두 번 쓰지 않는다: 표시 이름이 사용자 이름과 다를 때만 @사용자이름을 붙인다
    const seoTitle = profile.display_name && profile.display_name !== profile.username
      ? `${profile.display_name} (@${profile.username}) - Spoonie`
      : `${displayName}님의 요리 기록 - Spoonie`
    
    // 키워드 생성
    const keywords = [
      displayName,
      profile.username,
      '프로필',
      '요리',
      '레시피',
      '레시피드',
      'Spoonie',
      '요리 블로거'
    ].filter(Boolean).join(', ')

    return {
      title: seoTitle,
      description: profileDescription,
      keywords,
      
      // Open Graph 최적화 (소셜 공유)
      openGraph: {
        title: `${displayName} - Spoonie`,
        description: profileDescription,
        images: [{ 
          url: profileImageUrl,
          alt: `${displayName}님의 프로필 사진`
        }],
        type: 'profile',
        siteName: 'Spoonie',
      },
      
      // Twitter Cards 최적화
      twitter: {
        card: 'summary',
        title: seoTitle,
        description: profileDescription,
        images: [profileImageUrl],
      },
      
      // 검색 엔진 최적화
      robots: hasSearchContent
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
      title: '프로필 - Spoonie',
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
  const p = initial ? initial.profile : null
  const profileSchema = p?.public_id
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url: `${baseUrl}/profile/${p.public_id}`,
        ...(p.created_at && { dateCreated: p.created_at }),
        mainEntity: {
          '@type': 'Person',
          name: p.display_name || p.username,
          alternateName: p.username,
          identifier: p.public_id,
          url: `${baseUrl}/profile/${p.public_id}`,
          ...(p.profile_message && { description: p.profile_message.slice(0, 300) }),
          ...(p.avatar_url && { image: p.avatar_url }),
        },
        ...(initial?.items?.length && {
          hasPart: initial.items.slice(0, 12).map((item) => ({
            '@type': item.item_type === 'recipe' ? 'Recipe' : 'SocialMediaPosting',
            url: `${baseUrl}/${item.item_type === 'recipe' ? 'recipes' : 'posts'}/${item.item_id || item.id}`,
          })),
        }),
      }
    : null

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      {profileSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(profileSchema) }} />}
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
