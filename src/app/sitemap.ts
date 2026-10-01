/**
 * 동적 사이트맵. 요청마다 DB를 조회하므로 새 글, 삭제, 비공개 전환이 자동으로 반영된다.
 */

import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// cookies를 쓰는 Supabase 서버 클라이언트 때문에 동적 렌더링
export const dynamic = 'force-dynamic'

// PostgREST 기본 응답 한도가 1000행이므로 종류별 최대 1000개.
// 더 많아지면 generateSitemaps로 사이트맵을 나눠야 한다.
const MAX_PER_TYPE = 1000

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>
type ItemRow = { id: string; created_at: string; updated_at?: string | null }

/**
 * 공개 항목 조회. items.updated_at 컬럼이 있으면 수정 시각을 쓰고,
 * 아직 없으면(42703: undefined_column) 작성 시각으로 대체한다.
 */
async function getPublicItems(supabase: SupabaseServerClient, itemType: 'recipe' | 'post'): Promise<ItemRow[]> {
  const query = (columns: string) =>
    supabase
      .from('items')
      .select(columns)
      .eq('is_public', true)
      .eq('item_type', itemType)
      .order('created_at', { ascending: false })
      .limit(MAX_PER_TYPE)

  const withUpdated = await query('id, created_at, updated_at')
  if (!withUpdated.error) return (withUpdated.data ?? []) as unknown as ItemRow[]
  if (withUpdated.error.code !== '42703') throw withUpdated.error

  const createdOnly = await query('id, created_at')
  if (createdOnly.error) throw createdOnly.error
  return (createdOnly.data ?? []) as unknown as ItemRow[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'

  // 검색 결과, 로그인, 회원가입, 회원 전용 레시피북은 색인 대상이 아니므로 넣지 않는다
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
  ]

  try {
    const supabase = createSupabaseServerClient()

    const [recipes, posts, profilesResult] = await Promise.all([
      getPublicItems(supabase, 'recipe'),
      getPublicItems(supabase, 'post'),
      supabase
        .from('profiles')
        .select('public_id, updated_at')
        .not('public_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(MAX_PER_TYPE),
    ])

    const lastModified = (row: ItemRow) => new Date(row.updated_at || row.created_at)

    return [
      ...staticPages,
      ...recipes.map((recipe) => ({
        url: `${baseUrl}/recipes/${recipe.id}`,
        lastModified: lastModified(recipe),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...posts.map((post) => ({
        url: `${baseUrl}/posts/${post.id}`,
        lastModified: lastModified(post),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
      ...(profilesResult.data ?? []).map((profile) => ({
        url: `${baseUrl}/profile/${profile.public_id}`,
        lastModified: new Date(profile.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.4,
      })),
    ]
  } catch (error) {
    console.error('❌ Sitemap generation error:', error)
    return staticPages
  }
}
