import type { PartnerEntrySource } from "@/shared/lib/partner-entry"

export type OnboardingActorType = "creator" | "brand"
export type OnboardingSourceType = "instagram_post" | "instagram_reel" | "instagram_tv" | "web"
export type OnboardingDraftStatus =
  | "extracting"
  | "needs_input"
  | "private_draft"
  | "reviewed"
  | "published"
  | "failed"

export interface OnboardingIngredientDraft {
  raw: string
  name: string
  amount: number | null
  unit: string | null
}

export interface OnboardingRecipeData {
  title: string
  description: string
  servings: number | null
  cooking_time_minutes: number | null
  ingredients: OnboardingIngredientDraft[]
  instructions: Array<{ description: string }>
  tags: string[]
  source_image_url: string | null
  source_url: string
}

export interface OnboardingReviewDraft {
  id: string
  status: OnboardingDraftStatus
  itemId: string | null
  actorType: OnboardingActorType
  entrySource: PartnerEntrySource
  sourceType: OnboardingSourceType
  sourceUrl: string
  unresolvedFields: string[]
  recipe: OnboardingRecipeData
  sourceImageEndpoint: string | null
}

export interface OnboardingStatusSource {
  id: string
  sourceType: OnboardingSourceType
  sourceUrl: string
  processingStatus: string
  processingError: string | null
  draft: {
    id: string
    status: OnboardingDraftStatus
    itemId: string | null
    unresolvedFields: string[]
  } | null
}

export interface OnboardingStatusRequest {
  id: string
  actorType: OnboardingActorType
  status: string
  createdAt: string
  sources: OnboardingStatusSource[]
}
