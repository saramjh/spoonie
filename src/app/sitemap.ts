/**
 * 사이트맵. 검색 유입의 착지인 레시피와, 공개 레시피가 있는 작성자 프로필만 넣는다.
 * 레시피드는 색인하지 않으므로 넣지 않는다 (docs/discovery-and-behavior.md).
 * 로그인 정보 없이 공개 데이터로 만들고 1시간마다 다시 만든다 (크롤러가 올 때마다 서버 함수가 돌지 않게).
 */

import { MetadataRoute } from 'next'
import { createSupabasePublicClient } from '@/shared/infra/supabase-public'

export const revalidate = 3600

// PostgREST 기본 응답 한도가 1000행이므로 종류별 최대 1000개.
// 더 많아지면 generateSitemaps로 사이트맵을 나눠야 한다.
const MAX_PER_TYPE = 1000

type SupabaseServerClient = ReturnType<typeof createSupabasePublicClient>
type ItemRow = { id: string; user_id: string; created_at: string; updated_at?: string | null }

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

  const withUpdated = await query('id, user_id, created_at, updated_at')
  if (!withUpdated.error) return (withUpdated.data ?? []) as unknown as ItemRow[]
  if (withUpdated.error.code !== '42703') throw withUpdated.error

  const createdOnly = await query('id, user_id, created_at')
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
    const supabase = createSupabasePublicClient()
    const recipes = await getPublicItems(supabase, 'recipe')
    const authorIds = Array.from(new Set(recipes.map((r) => r.user_id)))
    const profilesResult = authorIds.length
      ? await supabase.from('profiles').select('public_id, updated_at').in('id', authorIds).not('public_id', 'is', null)
      : { data: [] as { public_id: string; updated_at: string }[] }

    const lastModified = (row: ItemRow) => new Date(row.updated_at || row.created_at)

    return [
      ...staticPages,
      ...recipes.map((recipe) => ({
        url: `${baseUrl}/recipes/${recipe.id}`,
        lastModified: lastModified(recipe),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
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
