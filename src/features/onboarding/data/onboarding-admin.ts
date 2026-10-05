import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type {
  OnboardingActorType,
  OnboardingRecipeData,
  OnboardingReviewDraft,
  OnboardingSourceType,
  OnboardingStatusRequest,
} from "../contracts"
import { extractOnboardingDraft } from "../domain/source-extraction"
import {
  fetchOnboardingHtml,
  OnboardingSourceFetchError,
} from "./source-fetch"

type AdminClient = SupabaseClient

type SourceRow = {
  id: string
  request_id: string
  user_id: string
  source_type: OnboardingSourceType
  source_url: string
  processing_status: string
  attempt_count: number | null
  next_retry_at: string | null
  created_at: string
}

const REQUIRED_FIELDS = [
  "title",
  "image",
  "servings",
  "cooking_time",
  "ingredients",
  "instructions",
]

export function createOnboardingAdminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !secretKey) {
    throw new Error("Partner onboarding server is missing Supabase configuration")
  }
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function blankRecipe(sourceUrl: string): OnboardingRecipeData {
  return {
    title: "",
    description: "",
    servings: null,
    cooking_time_minutes: null,
    ingredients: [],
    instructions: [],
    tags: [],
    source_image_url: null,
    source_url: sourceUrl,
  }
}

function retryAt(attempt: number) {
  const minutes = attempt <= 1 ? 15 : 60
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

async function refreshRequestStatus(admin: AdminClient, requestId: string) {
  const [{ data: sources }, { data: drafts }] = await Promise.all([
    admin
      .from("content_onboarding_sources")
      .select("processing_status")
      .eq("request_id", requestId),
    admin
      .from("content_onboarding_drafts")
      .select("status")
      .eq("request_id", requestId),
  ])

  const statuses = (sources || []).map((row) => row.processing_status)
  const stillProcessing = statuses.some((status) =>
    ["queued", "fetching", "extracting", "validating", "failed"].includes(status),
  )
  const requestStatus = stillProcessing
    ? "processing"
    : (drafts || []).length > 0
      ? "needs_review"
      : "failed"

  await admin
    .from("content_onboarding_requests")
    .update({ status: requestStatus, updated_at: new Date().toISOString() })
    .eq("id", requestId)
}

async function terminalNeedsInput(
  admin: AdminClient,
  source: SourceRow,
  errorMessage: string,
) {
  await admin.from("content_onboarding_drafts").upsert(
    {
      request_id: source.request_id,
      source_id: source.id,
      user_id: source.user_id,
      status: "needs_input",
      recipe_data: blankRecipe(source.source_url),
      evidence: {
        source_url: source.source_url,
        source_type: source.source_type,
        extraction: "page_metadata",
        fetch_error: errorMessage,
        source_image_url: null,
      },
      unresolved_fields: REQUIRED_FIELDS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "source_id" },
  )

  await admin
    .from("content_onboarding_sources")
    .update({
      processing_status: "needs_creator_input",
      processing_error: errorMessage,
      next_retry_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id)
}

async function processClaimedSource(admin: AdminClient, source: SourceRow) {
  try {
    await admin
      .from("content_onboarding_sources")
      .update({ processing_status: "extracting", updated_at: new Date().toISOString() })
      .eq("id", source.id)

    const fetched = await fetchOnboardingHtml(source.source_url)
    const extracted = extractOnboardingDraft(fetched.html, {
      sourceType: source.source_type,
      sourceUrl: source.source_url,
    })

    await admin
      .from("content_onboarding_sources")
      .update({ processing_status: "validating", updated_at: new Date().toISOString() })
      .eq("id", source.id)

    const draftStatus =
      extracted.unresolvedFields.length === 0 ? "private_draft" : "needs_input"
    await admin.from("content_onboarding_drafts").upsert(
      {
        request_id: source.request_id,
        source_id: source.id,
        user_id: source.user_id,
        status: draftStatus,
        recipe_data: extracted.recipe,
        evidence: {
          ...extracted.evidence,
          final_url: fetched.finalUrl,
        },
        unresolved_fields: extracted.unresolvedFields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id" },
    )

    await admin
      .from("content_onboarding_sources")
      .update({
        processing_status:
          extracted.unresolvedFields.length === 0 ? "ready" : "needs_creator_input",
        processing_error: null,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id)

    return { id: source.id, status: draftStatus }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "source processing failed"
    const permanent = error instanceof OnboardingSourceFetchError && error.permanent
    const attempt = source.attempt_count || 1

    if (permanent || attempt >= 3) {
      await terminalNeedsInput(admin, source, message)
      return { id: source.id, status: "needs_input" }
    }

    await admin
      .from("content_onboarding_sources")
      .update({
        processing_status: "failed",
        processing_error: message,
        next_retry_at: retryAt(attempt),
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id)

    return { id: source.id, status: "retry" }
  } finally {
    await refreshRequestStatus(admin, source.request_id)
  }
}

async function claimSource(admin: AdminClient, source: SourceRow) {
  const attempt = (source.attempt_count || 0) + 1
  const { data } = await admin
    .from("content_onboarding_sources")
    .update({
      processing_status: "fetching",
      processing_error: null,
      attempt_count: attempt,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id)
    .eq("processing_status", source.processing_status)
    .select(
      "id,request_id,user_id,source_type,source_url,processing_status,attempt_count,next_retry_at,created_at",
    )
    .maybeSingle()

  return data as SourceRow | null
}

export async function processOnboardingSourceIds(sourceIds: string[]) {
  if (sourceIds.length === 0) return []
  const admin = createOnboardingAdminClient()
  const { data, error } = await admin
    .from("content_onboarding_sources")
    .select(
      "id,request_id,user_id,source_type,source_url,processing_status,attempt_count,next_retry_at,created_at",
    )
    .in("id", sourceIds)

  if (error) throw error
  const claimed = (
    await Promise.all(
      ((data || []) as SourceRow[]).map((source) => claimSource(admin, source)),
    )
  ).filter((source): source is SourceRow => Boolean(source))

  return Promise.all(claimed.map((source) => processClaimedSource(admin, source)))
}

export async function processDueOnboardingSources(limit = 5) {
  const admin = createOnboardingAdminClient()
  const { data, error } = await admin
    .from("content_onboarding_sources")
    .select(
      "id,request_id,user_id,source_type,source_url,processing_status,attempt_count,next_retry_at,created_at",
    )
    .in("processing_status", ["queued", "failed"])
    .order("created_at", { ascending: true })
    .limit(Math.max(limit * 3, limit))

  if (error) throw error
  const now = Date.now()
  const due = ((data || []) as SourceRow[])
    .filter(
      (source) =>
        source.processing_status === "queued" ||
        !source.next_retry_at ||
        Date.parse(source.next_retry_at) <= now,
    )
    .slice(0, limit)

  return processOnboardingSourceIds(due.map((source) => source.id))
}

function entrySource(actorType: OnboardingActorType) {
  return actorType === "brand" ? "partner_brand" : "partner_creator"
}

export async function loadUserOnboardingDraft(
  userId: string,
  draftId: string,
): Promise<OnboardingReviewDraft | null> {
  const admin = createOnboardingAdminClient()
  const { data: draft } = await admin
    .from("content_onboarding_drafts")
    .select("id,request_id,source_id,item_id,status,recipe_data,unresolved_fields")
    .eq("id", draftId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!draft) return null

  const [{ data: request }, { data: source }] = await Promise.all([
    admin
      .from("content_onboarding_requests")
      .select("actor_type")
      .eq("id", draft.request_id)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("content_onboarding_sources")
      .select("source_type,source_url")
      .eq("id", draft.source_id)
      .eq("user_id", userId)
      .maybeSingle(),
  ])
  if (!request || !source) return null

  const recipe = draft.recipe_data as OnboardingRecipeData
  return {
    id: draft.id,
    status: draft.status,
    itemId: draft.item_id,
    actorType: request.actor_type,
    entrySource: entrySource(request.actor_type),
    sourceType: source.source_type,
    sourceUrl: source.source_url,
    unresolvedFields: draft.unresolved_fields || [],
    recipe,
    sourceImageEndpoint: recipe.source_image_url
      ? "/api/partner-onboarding/image?draft=" + encodeURIComponent(draft.id)
      : null,
  }
}

export async function loadUserOnboardingRequests(
  userId: string,
): Promise<OnboardingStatusRequest[]> {
  const admin = createOnboardingAdminClient()
  const { data: requests } = await admin
    .from("content_onboarding_requests")
    .select("id,actor_type,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)
  if (!requests?.length) return []

  const requestIds = requests.map((request) => request.id)
  const { data: sources } = await admin
    .from("content_onboarding_sources")
    .select(
      "id,request_id,source_type,source_url,processing_status,processing_error,sort_order",
    )
    .eq("user_id", userId)
    .in("request_id", requestIds)
    .order("sort_order", { ascending: true })

  const sourceIds = (sources || []).map((source) => source.id)
  const { data: drafts } = sourceIds.length
    ? await admin
        .from("content_onboarding_drafts")
        .select("id,source_id,item_id,status,unresolved_fields")
        .eq("user_id", userId)
        .in("source_id", sourceIds)
    : { data: [] }

  const draftBySource = new Map((drafts || []).map((draft) => [draft.source_id, draft]))
  return requests.map((request) => ({
    id: request.id,
    actorType: request.actor_type,
    status: request.status,
    createdAt: request.created_at,
    sources: (sources || [])
      .filter((source) => source.request_id === request.id)
      .map((source) => {
        const draft = draftBySource.get(source.id)
        return {
          id: source.id,
          sourceType: source.source_type,
          sourceUrl: source.source_url,
          processingStatus: source.processing_status,
          processingError: source.processing_error,
          draft: draft
            ? {
                id: draft.id,
                status: draft.status,
                itemId: draft.item_id,
                unresolvedFields: draft.unresolved_fields || [],
              }
            : null,
        }
      }),
  }))
}
