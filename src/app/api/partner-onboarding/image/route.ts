import "server-only"

import { NextResponse } from "next/server"

import { createOnboardingAdminClient } from "@/features/onboarding/data/onboarding-admin"
import { fetchOnboardingImage } from "@/features/onboarding/data/source-fetch"
import type { OnboardingRecipeData } from "@/features/onboarding/contracts"
import { createSupabaseRouteHandlerClient } from "@/shared/infra/supabase-server"

export async function GET(request: Request) {
  const auth = await createSupabaseRouteHandlerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const draftId = new URL(request.url).searchParams.get("draft")
  if (!draftId || !/^[0-9a-f-]{36}$/i.test(draftId)) {
    return NextResponse.json({ error: "Invalid draft" }, { status: 400 })
  }

  const admin = createOnboardingAdminClient()
  const { data: draft } = await admin
    .from("content_onboarding_drafts")
    .select("recipe_data")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .maybeSingle()

  const recipe = draft?.recipe_data as OnboardingRecipeData | undefined
  if (!recipe?.source_image_url) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 })
  }

  try {
    const image = await fetchOnboardingImage(recipe.source_image_url)
    return new Response(image.body, {
      status: 200,
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Onboarding source image proxy failed:", error)
    return NextResponse.json({ error: "Image unavailable" }, { status: 502 })
  }
}
