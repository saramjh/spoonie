/**
 * 🚀 동적 사이트맵 생성 (SEO 최적화)
 * TBWA 가이드 기반 구현
 */

import { MetadataRoute } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// 🔧 동적 라우팅 강제 (cookies 사용하는 Supabase 때문)
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
  
  // 기본 정적 페이지들
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0, // 홈페이지 최고 우선순위
    },
    {
      url: `${baseUrl}/recipes`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9, // 레시피북 높은 우선순위
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }
  ]

  try {
    const supabase = createSupabaseServerClient()
    
    // 🍳 공개 레시피들 (SEO 핵심 콘텐츠)
    const { data: publicRecipes } = await supabase
      .from('items')
      .select('id, created_at, item_type')
      .eq('is_public', true)
      .eq('item_type', 'recipe')
      .order('created_at', { ascending: false })
      .limit(1000) // 사이트맵 크기 제한

    // 📝 공개 포스트들
    const { data: publicPosts } = await supabase
      .from('items')
      .select('id, created_at, item_type')
      .eq('is_public', true)
      .eq('item_type', 'post')
      .order('created_at', { ascending: false })
      .limit(500) // 포스트는 레시피보다 낮은 우선순위

    // 👥 활성 사용자 프로필들
    const { data: profiles } = await supabase
      .from('profiles')
      .select('public_id, updated_at')
      .not('public_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(200) // 주요 사용자들만

    // 동적 페이지들 추가
    const dynamicPages = []

    // 레시피 상세 페이지들
    if (publicRecipes) {
      dynamicPages.push(...publicRecipes.map(recipe => ({
        url: `${baseUrl}/recipes/${recipe.id}`,
        lastModified: new Date(recipe.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8, // 레시피는 높은 우선순위
      })))
    }

    // 포스트 상세 페이지들  
    if (publicPosts) {
      dynamicPages.push(...publicPosts.map(post => ({
        url: `${baseUrl}/posts/${post.id}`,
        lastModified: new Date(post.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.6, // 포스트는 중간 우선순위
      })))
    }

    // 사용자 프로필 페이지들
    if (profiles) {
      dynamicPages.push(...profiles.map(profile => ({
        url: `${baseUrl}/profile/${profile.public_id}`,
        lastModified: new Date(profile.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.4, // 프로필은 낮은 우선순위
      })))
    }

    return [...staticPages, ...dynamicPages]

  } catch (error) {
    console.error('❌ Sitemap generation error:', error)
    // 에러 시 기본 정적 페이지만 반환
    return staticPages
  }
}

/**
 * 💡 TBWA 가이드 SEO 원칙 적용:
 * 1. 우선순위 기반 페이지 분류 (홈 > 레시피 > 포스트 > 프로필)
 * 2. 업데이트 빈도 차별화 (콘텐츠 성격에 맞게)
 * 3. 최신 콘텐츠 우선 (updated_at 기준 정렬)
 * 4. 성능 고려 (페이지 수 제한으로 크롤링 효율화)
 */