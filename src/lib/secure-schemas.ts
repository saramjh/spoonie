/**
 * 🛡️ 보안이 강화된 Zod 스키마
 * XSS 방지, 입력 검증, 레이트 리미팅이 적용된 스키마들
 */

import * as z from "zod"
import { sanitizeHtml, sanitizeUserContent, validateEmail, safeParseFloat } from './security-utils'

// ================================
// 1. 기본 보안 스키마
// ================================

/**
 * XSS 방지가 적용된 문자열 스키마
 */
const secureString = (minLength: number = 1, maxLength: number = 1000) =>
  z.string()
    .min(minLength, `최소 ${minLength}글자 이상 입력해주세요.`)
    .max(maxLength, `최대 ${maxLength}글자까지 입력 가능합니다.`)
    .transform(sanitizeHtml)
    .refine(str => str.trim().length >= minLength, '유효한 내용을 입력해주세요.')

/**
 * 사용자 콘텐츠용 (일부 HTML 허용)
 */
const secureContent = (minLength: number = 1, maxLength: number = 5000) =>
  z.string()
    .min(minLength, `최소 ${minLength}글자 이상 입력해주세요.`)
    .max(maxLength, `최대 ${maxLength}글자까지 입력 가능합니다.`)
    .transform(sanitizeUserContent)
    .refine(str => str.trim().length >= minLength, '유효한 내용을 입력해주세요.')

/**
 * 안전한 숫자 스키마
 */
const secureNumber = (min: number = 0, max: number = Number.MAX_SAFE_INTEGER) =>
  z.union([z.number(), z.string()])
    .transform((value) => safeParseFloat(value))
    .refine(num => num >= min && num <= max, `${min}~${max} 범위의 숫자를 입력해주세요.`)

/**
 * UUID 검증 스키마
 */
const uuidSchema = z.string().uuid('올바른 ID 형식이 아닙니다.')

// ================================
// 2. 레시피 스키마 (보안 강화)
// ================================

export const secureRecipeSchema = z.object({
  // 제목: XSS 방지 + 길이 제한
  title: secureString(3, 100),
  
  // 설명: 일부 HTML 허용 (볼드, 이탤릭 등)
  description: secureContent(0, 1000).optional(),
  
  // 인분: 안전한 숫자 변환
  servings: secureNumber(1, 50),
  
  // 조리 시간: 안전한 숫자 변환
  cooking_time_minutes: secureNumber(1, 1440), // 최대 24시간
  
  // 공개 설정: 부울린 검증
  is_public: z.boolean(),
  
  // 재료: 보안 검증된 배열
  ingredients: z
    .array(
      z.object({
        name: secureString(1, 50),
        amount: secureNumber(0.1, 10000),
        unit: secureString(1, 20),
      })
    )
    .min(1, "재료를 하나 이상 추가해주세요.")
    .max(30, "재료는 최대 30개까지 추가할 수 있습니다."),
  
  // 조리법: 보안 검증된 배열
  instructions: z
    .array(
      z.object({
        description: secureContent(1, 500),
        image_url: z.string().url().optional(),
      })
    )
    .min(1, "조리법을 하나 이상 추가해주세요.")
    .max(20, "조리법은 최대 20단계까지 추가할 수 있습니다."),
  
  // 색상 라벨: 미리 정의된 값만 허용
  color_label: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']).nullable().optional(),
  
  // 태그: XSS 방지된 배열
  tags: z
    .string()
    .optional()
    .transform((str) =>
      str
        ? str
            .split(",")
            .map((tag) => sanitizeHtml(tag.trim()))
            .filter((tag) => tag.length > 0 && tag.length <= 20)
            .slice(0, 10) // 최대 10개 태그
        : []
    )
    .pipe(z.array(z.string())),
  
  // 참고 레시피: UUID 검증
  cited_recipe_ids: z.array(uuidSchema).max(5, "참고 레시피는 최대 5개까지 선택할 수 있습니다.").optional(),
})

// ================================
// 3. 포스트 스키마 (보안 강화)
// ================================

export const securePostSchema = z.object({
  // 제목: XSS 방지 + 길이 제한
  title: secureString(3, 100),
  
  // 내용: 사용자 콘텐츠 (일부 HTML 허용)
  content: secureContent(1, 2000),
  
  // 공개 설정
  is_public: z.boolean(),
  
  // 태그: XSS 방지된 배열
  tags: z
    .string()
    .optional()
    .transform((str) =>
      str
        ? str
            .split(",")
            .map((tag) => sanitizeHtml(tag.trim()))
            .filter((tag) => tag.length > 0 && tag.length <= 20)
            .slice(0, 10)
        : []
    )
    .pipe(z.array(z.string())),
  
  // 참고 레시피: UUID 검증
  cited_recipe_ids: z.array(uuidSchema).max(5).optional(),
})

// ================================
// 4. 프로필 스키마 (보안 강화)
// ================================

export const secureProfileSchema = z.object({
  // 사용자명: 특수문자 제한
  username: z
    .string()
    .min(2, "사용자명은 2글자 이상이어야 합니다.")
    .max(20, "사용자명은 20글자 이하여야 합니다.")
    .regex(/^[a-zA-Z0-9가-힣_-]+$/, "사용자명에는 문자, 숫자, 언더스코어, 하이픈만 사용할 수 있습니다.")
    .transform(sanitizeHtml),
  
  // 표시명: XSS 방지
  display_name: secureString(1, 30).optional(),
  
  // 프로필 메시지: 안전한 콘텐츠
  profile_message: secureContent(0, 200).optional(),
  
  // 이메일: 검증된 이메일
  email: z
    .string()
    .email("올바른 이메일 형식이 아닙니다.")
    .refine(validateEmail, "유효하지 않은 이메일입니다."),
})