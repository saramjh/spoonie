import "server-only"

import { NextResponse } from "next/server"

import {
  createOnboardingAdminClient,
  loadUserOnboardingDraft,
  loadUserOnboardingRequests,
  processOnboardingSourceIds,
} from "@/features/onboarding/data/onboarding-admin"
import { createSupabaseRouteHandlerClient } from "@/shared/infra/supabase-server"
import {
  type PartnerOnboardingPayload,
  validatePartnerOnboardingRequest,
} from "./validation"

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true

  try {
    const requestUrl = new URL(request.url)
    const originUrl = new URL(origin)
    if (originUrl.origin === requestUrl.origin) return true
    if (originUrl.hostname === "spoonie.kr" || originUrl.hostname === "www.spoonie.kr") return true
    return originUrl.hostname === "127.0.0.1" || originUrl.hostname === "localhost"
  } catch {
    return false
  }
}

async function authenticatedUser() {
  const authClient = await createSupabaseRouteHandlerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user
}

export async function GET(request: Request) {
  const user = await authenticatedUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const draftId = new URL(request.url).searchParams.get("draft")
  if (draftId) {
    if (!/^[0-9a-f-]{36}$/i.test(draftId)) {
      return NextResponse.json({ error: "Invalid draft" }, { status: 400 })
    }
    const draft = await loadUserOnboardingDraft(user.id, draftId)
    if (!draft) return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 })
    return NextResponse.json({ draft })
  }

  return NextResponse.json({ requests: await loadUserOnboardingRequests(user.id) })
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 })
  }
  const contentLength = Number(request.headers.get("content-length") || "0")
  if (contentLength > 12_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  const user = await authenticatedUser()
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as PartnerOnboardingPayload | null
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const parsed = validatePartnerOnboardingRequest(body)
  if (!parsed) {
    return NextResponse.json(
      { error: "자료 주소와 권한 확인 내용을 다시 확인해 주세요." },
      { status: 400 },
    )
  }

  const admin = createOnboardingAdminClient()
  const { data: onboardingRequest, error: requestError } = await admin
    .from("content_onboarding_requests")
    .insert({
      user_id: user.id,
      actor_type: parsed.actorType,
      status: "processing",
      note: parsed.note,
      rights_confirmed: parsed.rightsConfirmed,
      source_path: parsed.sourcePath,
    })
    .select("id")
    .single()

  if (requestError || !onboardingRequest) {
    console.error("Partner onboarding request insert failed:", requestError?.message)
    return NextResponse.json(
      { error: "초기 셋업 요청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    )
  }

  const { data: sources, error: sourceError } = await admin
    .from("content_onboarding_sources")
    .insert(
      parsed.sources.map((source, index) => ({
        request_id: onboardingRequest.id,
        user_id: user.id,
        source_type: source.sourceType,
        source_url: source.sourceUrl,
        sort_order: index,
        processing_status: "queued",
      })),
    )
    .select("id")

  if (sourceError || !sources) {
    console.error("Partner onboarding sources insert failed:", sourceError?.message)
    await admin.from("content_onboarding_requests").delete().eq("id", onboardingRequest.id)
    return NextResponse.json(
      { error: "자료 주소를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    )
  }

  if (parsed.actorType === "brand") {
    const { error: profileError } = await admin
      .from("profiles")
      .update({ entity_type: "organization" })
      .eq("id", user.id)
    if (profileError) console.error("Brand profile entity type update failed:", profileError.message)
  }

  try {
    await processOnboardingSourceIds(sources.map((source) => source.id))
  } catch (error) {
    console.error("Initial onboarding source processing failed:", error)
  }

  return NextResponse.json({ ok: true, requestId: onboardingRequest.id }, { status: 201 })
}
