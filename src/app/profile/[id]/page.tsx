import { serializeJsonLd } from "@/shared/lib/json-ld"
import { Metadata } from 'next'
import { createSupabasePublicClient } from '@/shared/infra/supabase-public'
import { notFound } from 'next/navigation'
import ProfilePageClient from './ProfilePageClient'
import { fetchUserItems, fetchFollowCounts, profileIdentifierColumn, PUBLIC_PROFILE_COLUMNS, type UserProfile } from '@/features/profile/data/profile-repository'
import BreadcrumbSchema, { createBreadcrumbs } from '@/components/ai-search-optimization/BreadcrumbSchema'
import { isNormalPublicRecipeed, isSearchIndexableProfile } from '@/features/discovery/domain/search-exposure'
import { fetchAllPublicDiscoveryItems } from '@/features/discovery/data/public-assets'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const profileColumn = profileIdentifierColumn(params.id)
  const isLegacyId = profileColumn === 'id'
  try {
    const supabase = createSupabasePublicClient()
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        public_id,
        display_name,
        username,
        avatar_url,
        entity_type,
        profile_message,
        is_profile_public,
        created_at
      `)
      .eq(profileColumn, params.id)
      .single()

    if (error || !profile?.public_id) {
      return { 
        title: '프로필 - Spoonie',
        description: '요리를 사랑하는 사람들의 프로필을 확인해보세요.',
        robots: { index: false, follow: true }, // 없는 프로필
      }
    }

    // Profile 자체의 identity + 정상 공개 활동을 판정한다.
    // Recipeed의 index boolean을 그대로 승계하지 않아 두 정책이 독립적으로 조정될 수 있다.
    // UUID 호환 URL은 noindex다. canonical identity를 확인한 뒤 색인 판정용 활동 조회는 생략한다.
    const publicItems = isLegacyId ? [] : await fetchAllPublicDiscoveryItems({ userId: profile.id }, supabase)
    const publicRecipes = publicItems.filter((item) => item.item_type === 'recipe').length
    const publicPosts = publicItems.filter((item) => item.item_type === 'post')
    const normalPublicPosts = publicPosts.filter(isNormalPublicRecipeed).length
    const hasSearchContent = !isLegacyId && isSearchIndexableProfile(profile, publicRecipes, normalPublicPosts)

    // 표시 이름이 있으면 그것을 (공식 계정 "Spoonie 주방"), 없으면 사용자 이름
    const displayName = profile.display_name || profile.username || '익명'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
    const profileUrl = `${baseUrl}/profile/${profile.public_id}`
    const profileImageUrl = profile.avatar_url || `${baseUrl}/og-default.png`
    const isOrganization = profile.entity_type === 'organization'
    
    // 프로필 설명 생성 (profile_message 우선, 없으면 통계 기반)
    let profileDescription = ''
    const intro = profile.profile_message
    if (isLegacyId) {
      // 활동 통계는 실제로 조회한 canonical URL에서만 표시한다.
      profileDescription = intro
        ? intro.replace(/\n/g, ' ').slice(0, 120)
        : `${displayName}님의 Spoonie 프로필. 공개 요리 기록을 볼 수 있어요.`
    } else if (intro) {
      profileDescription = `${intro.replace(/\n/g, ' ').slice(0, 120)} — 공개 레시피 ${publicRecipes}개 · 레시피드 ${publicPosts.length}개`
    } else {
      profileDescription = `${displayName}님이 Spoonie에 올린 공개 레시피 ${publicRecipes}개와 레시피드 ${publicPosts.length}개. 요리법과 음식·주방의 경험 기록을 볼 수 있어요.`
    }
    
    // 같은 이름을 두 번 쓰지 않는다: 표시 이름이 사용자 이름과 다를 때만 @사용자이름을 붙인다
    const seoTitle = profile.display_name && profile.display_name !== profile.username
      ? `${profile.display_name} (@${profile.username}) - Spoonie`
      : isOrganization ? `${displayName} - Spoonie` : `${displayName}님의 요리 기록 - Spoonie`
    
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
      
      openGraph: {
        url: profileUrl,
        title: `${displayName} - Spoonie`,
        description: profileDescription,
        images: [{ 
          url: profileImageUrl,
          alt: `${displayName}님의 프로필 사진`
        }],
        type: 'profile',
        siteName: 'Spoonie',
      },
      
      twitter: {
        card: 'summary',
        title: seoTitle,
        description: profileDescription,
        images: [profileImageUrl],
      },
      
      robots: hasSearchContent
        ? { index: true, follow: true, googleBot: { 'max-image-preview': 'large', 'max-snippet': -1 } }
        : { index: false, follow: true, ...(isLegacyId && { googleBot: { index: false, follow: true } }) },
      
      alternates: {
        canonical: profileUrl,
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
      robots: { index: false, follow: true },
    }
  }
}

// 공개 프로필은 첫 방문 때 만들어 CDN에 두고 10분마다 갱신한다 (프로필이나 글이 바뀌면 /api/revalidate로 즉시 갱신).
// 로그인 정보를 읽지 않으므로 방문마다 서버 함수가 실행되지 않는다. 본인의 비공개 글·좋아요 상태는 브라우저가 채운다.
export const revalidate = 600

export async function generateStaticParams() {
  return []
}

// 존재하지 않는 프로필만 "not_found"로 구분하고, 일시 오류는 클라이언트 재조회에 맡긴다.
async function loadInitialProfileData(identifier: string) {
  try {
    const supabase = createSupabasePublicClient()
    const { data: profile, error } = await supabase.from('profiles').select(PUBLIC_PROFILE_COLUMNS).eq(profileIdentifierColumn(identifier), identifier).maybeSingle()
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
          '@type': p.entity_type === 'organization' ? 'Organization' : 'Person',
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
