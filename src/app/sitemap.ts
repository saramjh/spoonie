/**
 * 사이트맵. 검색에 보여 주고 싶은 canonical URL만 자동으로 넣는다.
 * - 공개 레시피: 항상 검색 자산
 * - 공개 레시피드: 공통 정보가치 정책을 통과한 글만
 * - 프로필: 검색 자산이 하나 이상 있는 작성자
 * - 주제: 검색 자산이 두 개 이상 모인 태그
 */

import { MetadataRoute } from 'next'
import { createSupabasePublicClient } from '@/shared/infra/supabase-public'
import { isSearchIndexableRecipeed, isSearchIndexableTopic } from '@/features/discovery/domain/search-exposure'
import { normalizeTags, topicHref } from '@/shared/lib/topics'

export const revalidate = 3600
const MAX_PER_TYPE = 1000

type SupabaseServerClient = ReturnType<typeof createSupabasePublicClient>
type ItemRow = {
  id: string
  user_id: string
  created_at: string
  updated_at?: string | null
  title?: string | null
  content?: string | null
  tags?: string[] | null
  image_urls?: string[] | null
  cited_recipe_ids?: string[] | null
}

async function getPublicItems(supabase: SupabaseServerClient, itemType: 'recipe' | 'post'): Promise<ItemRow[]> {
  const columns = itemType === 'post'
    ? 'id, user_id, created_at, updated_at, title, content, tags, image_urls, cited_recipe_ids'
    : 'id, user_id, created_at, updated_at, tags'
  const withUpdated = await supabase
    .from('items')
    .select(columns)
    .eq('is_public', true)
    .eq('item_type', itemType)
    .order('created_at', { ascending: false })
    .limit(MAX_PER_TYPE)
  if (!withUpdated.error) return (withUpdated.data ?? []) as unknown as ItemRow[]

  // 오래된 DB에서 updated_at이 없을 때만 작성일로 대체한다.
  if (withUpdated.error.code !== '42703') throw withUpdated.error
  const fallbackColumns = columns.replace(', updated_at', '')
  const createdOnly = await supabase
    .from('items')
    .select(fallbackColumns)
    .eq('is_public', true)
    .eq('item_type', itemType)
    .order('created_at', { ascending: false })
    .limit(MAX_PER_TYPE)
  if (createdOnly.error) throw createdOnly.error
  return (createdOnly.data ?? []) as unknown as ItemRow[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
  ]

  try {
    const supabase = createSupabasePublicClient()
    const [recipes, posts] = await Promise.all([
      getPublicItems(supabase, 'recipe'),
      getPublicItems(supabase, 'post'),
    ])
    const searchPosts = posts.filter(isSearchIndexableRecipeed)
    const searchItems = [...recipes, ...searchPosts]
    const authorIds = Array.from(new Set(searchItems.map((item) => item.user_id)))
    const profilesResult = authorIds.length
      ? await supabase.from('profiles').select('public_id, updated_at').in('id', authorIds).not('public_id', 'is', null)
      : { data: [] as { public_id: string; updated_at: string }[] }

    const topicCounts = new Map<string, number>()
    for (const item of searchItems) {
      for (const tag of normalizeTags(item.tags)) topicCounts.set(tag, (topicCounts.get(tag) ?? 0) + 1)
    }
    const topics = [...topicCounts.entries()].filter(([, count]) => isSearchIndexableTopic(count)).map(([tag]) => tag)
    const lastModified = (row: ItemRow) => new Date(row.updated_at || row.created_at)

    return [
      ...staticPages,
      ...recipes.map((recipe) => ({
        url: `${baseUrl}/recipes/${recipe.id}`,
        lastModified: lastModified(recipe),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...searchPosts.map((post) => ({
        url: `${baseUrl}/posts/${post.id}`,
        lastModified: lastModified(post),
        changeFrequency: 'weekly' as const,
        priority: 0.65,
      })),
      ...topics.map((tag) => ({
        url: `${baseUrl}${topicHref(tag)}`,
        changeFrequency: 'weekly' as const,
        priority: 0.55,
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
