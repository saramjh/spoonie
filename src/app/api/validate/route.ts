/**
 * 서버사이드 검증 API
 * 클라이언트 검증을 서버에서 재검증하여 보안 강화
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server'
import { secureRecipeSchema, securePostSchema, secureProfileSchema } from '@/lib/secure-schemas'
import { rateLimiter } from '@/lib/security-utils'
import { z } from 'zod'

// ================================
// 1. 검증 요청 스키마
// ================================

const validationRequestSchema = z.object({
  type: z.enum(['recipe', 'post', 'profile', 'comment']),
  data: z.record(z.string(), z.unknown()),
  userId: z.string().uuid().optional()
})

// ================================
// 2. 레이트 리미팅 설정
// ================================

const RATE_LIMITS = {
  validation: { maxAttempts: 100, windowMs: 60000 }, // 1분에 100회
  creation: { maxAttempts: 10, windowMs: 60000 },    // 1분에 10회
}

// ================================
// 3. 검증 함수들
// ================================

async function validateRecipe(data: any, userId?: string) {
  // 1. 스키마 검증
  const result = secureRecipeSchema.safeParse(data)
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    }
  }

  // 2. 비즈니스 로직 검증
  const validationErrors: Array<{ field: string; message: string }> = []

  // 참고 레시피 존재 확인
  if (result.data.cited_recipe_ids && result.data.cited_recipe_ids.length > 0) {
    const supabase = await createSupabaseRouteHandlerClient()
    const { data: citedRecipes, error } = await supabase
      .from('items')
      .select('id, is_public, user_id')
      .in('id', result.data.cited_recipe_ids)
      .eq('item_type', 'recipe')

    if (error || !citedRecipes) {
      validationErrors.push({
        field: 'cited_recipe_ids',
        message: '참고 레시피 정보를 확인할 수 없습니다.'
      })
    } else {
      // 존재하지 않는 레시피 확인
      const existingIds = citedRecipes.map(r => r.id)
      const missingIds = result.data.cited_recipe_ids.filter(id => !existingIds.includes(id))
      
      if (missingIds.length > 0) {
        validationErrors.push({
          field: 'cited_recipe_ids',
          message: '존재하지 않는 참고 레시피가 포함되어 있습니다.'
        })
      }

      // 비공개 레시피 참고 권한 확인
      const unauthorizedRefs = citedRecipes.filter(r => 
        !r.is_public && r.user_id !== userId
      )
      
      if (unauthorizedRefs.length > 0) {
        validationErrors.push({
          field: 'cited_recipe_ids',
          message: '비공개 레시피는 참고할 수 없습니다.'
        })
      }
    }
  }

  // 재료 수량 현실성 체크
  const unrealisticIngredients = result.data.ingredients.filter(ing => 
    ing.amount > 10000 || ing.amount < 0.001
  )
  
  if (unrealisticIngredients.length > 0) {
    validationErrors.push({
      field: 'ingredients',
      message: '재료 수량이 현실적이지 않습니다.'
    })
  }

  // 조리 시간 현실성 체크
  if (result.data.cooking_time_minutes > 1440) { // 24시간 초과
    validationErrors.push({
      field: 'cooking_time_minutes',
      message: '조리 시간이 너무 깁니다.'
    })
  }

  return {
    valid: validationErrors.length === 0,
    errors: validationErrors,
    data: result.data
  }
}

async function validatePost(data: any, _userId?: string) {
  const result = securePostSchema.safeParse(data)
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    }
  }

  // 스팸 감지 (간단한 버전)
  const spamKeywords = ['광고', '홍보', '클릭', '무료', '대박', '이벤트']
  const content = result.data.content.toLowerCase()
  const containsSpam = spamKeywords.some(keyword => content.includes(keyword))
  
  if (containsSpam) {
    return {
      valid: false,
      errors: [{ field: 'content', message: '스팸으로 의심되는 내용이 포함되어 있습니다.' }]
    }
  }

  return {
    valid: true,
    errors: [],
    data: result.data
  }
}

async function validateProfile(data: any, userId?: string) {
  const result = secureProfileSchema.safeParse(data)
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    }
  }

  // 사용자명 중복 확인
  if (result.data.username && userId) {
    const supabase = await createSupabaseRouteHandlerClient()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', result.data.username)
      .neq('id', userId)
      .single()

    if (existing) {
      return {
        valid: false,
        errors: [{ field: 'username', message: '이미 사용 중인 사용자명입니다.' }]
      }
    }
  }

  return {
    valid: true,
    errors: [],
    data: result.data
  }
}

// ================================
// 4. API 핸들러
// ================================

async function getSessionUserId(): Promise<string | undefined> {
  const supabase = await createSupabaseRouteHandlerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

export async function POST(request: NextRequest) {
  try {
    // 요청 파싱
    const body = await request.json()
    const parseResult = validationRequestSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          valid: false, 
          errors: [{ field: 'request', message: '잘못된 요청 형식입니다.' }] 
        },
        { status: 400 }
      )
    }

    const { type, data } = parseResult.data
    // 사용자 식별은 본문 값이 아니라 세션에서 한다 (본문 userId 위조로 레이트 리밋/한도 우회 방지)
    const userId = await getSessionUserId()

    // 레이트 리미팅
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    
    const rateKey = `validation_${clientIP}_${userId || 'anonymous'}`
    const rateCheck = rateLimiter.checkLimit(
      rateKey, 
      RATE_LIMITS.validation.maxAttempts, 
      RATE_LIMITS.validation.windowMs
    )

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          valid: false, 
          errors: [{ field: 'rate_limit', message: '너무 많은 요청을 보냈습니다.' }],
          resetTime: rateCheck.resetTime
        },
        { status: 429 }
      )
    }

    // 타입별 검증 실행
    let validationResult
    
    switch (type) {
      case 'recipe':
        validationResult = await validateRecipe(data, userId)
        break
      case 'post':
        validationResult = await validatePost(data, userId)
        break
      case 'profile':
        validationResult = await validateProfile(data, userId)
        break
      default:
        return NextResponse.json(
          { 
            valid: false, 
            errors: [{ field: 'type', message: '지원하지 않는 검증 타입입니다.' }] 
          },
          { status: 400 }
        )
    }

    return NextResponse.json(validationResult)

  } catch (error) {
    console.error('❌ Validation API error:', error)
    
    return NextResponse.json(
      { 
        valid: false, 
        errors: [{ field: 'server', message: '서버 오류가 발생했습니다.' }] 
      },
      { status: 500 }
    )
  }
}

// ================================
// 5. 생성 검증 (더 엄격한 레이트 리미팅)
// ================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.clone().json()
    const { type } = body
    const userId = await getSessionUserId()

    if (!userId) {
      return NextResponse.json(
        { valid: false, errors: [{ field: 'auth', message: '인증이 필요합니다.' }] },
        { status: 401 }
      )
    }

    // 생성 작업에 대한 더 엄격한 레이트 리미팅
    const createRateKey = `create_${type}_${userId}`
    const createRateCheck = rateLimiter.checkLimit(
      createRateKey,
      RATE_LIMITS.creation.maxAttempts,
      RATE_LIMITS.creation.windowMs
    )

    if (!createRateCheck.allowed) {
      return NextResponse.json(
        { 
          valid: false, 
          errors: [{ field: 'rate_limit', message: '생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }],
          resetTime: createRateCheck.resetTime
        },
        { status: 429 }
      )
    }

    // 기본 검증 실행
    const validationResult = await POST(request)
    
    if (!validationResult.ok) {
      return validationResult
    }

    // 추가 생성 검증 (예: 일일 생성 한도)
    const supabase = await createSupabaseRouteHandlerClient()
    const today = new Date().toISOString().split('T')[0]
    
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)

    if (count && count >= 50) { // 일일 50개 제한
      return NextResponse.json(
        { 
          valid: false, 
          errors: [{ field: 'daily_limit', message: '일일 생성 한도를 초과했습니다.' }] 
        },
        { status: 429 }
      )
    }

    return validationResult

  } catch (error) {
    console.error('❌ Creation validation error:', error)
    
    return NextResponse.json(
      { 
        valid: false, 
        errors: [{ field: 'server', message: '서버 오류가 발생했습니다.' }] 
      },
      { status: 500 }
    )
  }
}