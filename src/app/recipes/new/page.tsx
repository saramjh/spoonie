"use client"

import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"

import CreateContentAuthPrompt from "@/components/auth/CreateContentAuthPrompt"
import PartnerIdentityStep from "@/components/auth/PartnerIdentityStep"
import { PageLoading, StateSheet } from "@/components/kit"
import { Button } from "@/components/ui/button"
import type { OnboardingReviewDraft } from "@/features/onboarding/contracts"
import { fetchItemDetail } from "@/features/feed/data/item-detail"
import RecipeForm from "@/features/recipe/components/RecipeForm"
import { useNavigation } from "@/hooks/useNavigation"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { logEvent } from "@/shared/infra/events"
import { useRouter } from "@/shared/lib/navigation"
import {
  parsePartnerEntrySource,
  type PartnerEntrySource,
} from "@/shared/lib/partner-entry"
import type { ItemDetail } from "@/types/item"

export default function NewRecipePage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [forkFrom, setForkFrom] = useState<ItemDetail | null>(null)
  const [partnerSource, setPartnerSource] = useState<PartnerEntrySource | null>(null)
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingReviewDraft | null>(null)
  const [onboardingError, setOnboardingError] = useState("")
  const [needsIdentity, setNeedsIdentity] = useState(false)
  const [identityDefault, setIdentityDefault] = useState("")
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const router = useRouter()
  const { navigateBack } = useNavigation()

  useEffect(() => {
    let active = true
    let authChecked = false

    const checkUser = async () => {
      const {
        data: { user: currentUser },
        error,
      } = await supabase.auth.getUser()
      // 비로그인 세션 없음과 인증 서버/네트워크 장애를 구분한다.
      if (error && error.name !== "AuthSessionMissingError") throw error
      if (!active) return
      authChecked = true
      setUser(currentUser)

      const params = new URLSearchParams(window.location.search)
      const requestedSource = parsePartnerEntrySource(params.get("entry"))
      const onboardingId = params.get("onboarding")
      let resolvedSource = requestedSource

      if (currentUser && onboardingId) {
        if (!/^[0-9a-f-]{36}$/i.test(onboardingId)) {
          setOnboardingError("초안 주소를 확인할 수 없습니다.")
        } else {
          const response = await fetch(
            "/api/partner-onboarding?draft=" + encodeURIComponent(onboardingId),
            { credentials: "same-origin", cache: "no-store" },
          )
          const result = (await response.json().catch(() => null)) as
            | { draft?: OnboardingReviewDraft; error?: string }
            | null

          if (!active) return
          if (!response.ok || !result?.draft) {
            setOnboardingError(result?.error || "초안을 불러오지 못했습니다.")
          } else if (result.draft.itemId) {
            router.replace("/recipes/" + result.draft.itemId)
            return
          } else {
            setOnboardingDraft(result.draft)
            resolvedSource = result.draft.entrySource
          }
        }
      } else if (currentUser) {
        const forkId = params.get("fork")
        if (forkId && /^[0-9a-f-]{36}$/i.test(forkId)) {
          const sourceRecipe = await fetchItemDetail(supabase, forkId).catch(() => null)
          if (sourceRecipe?.item_type === "recipe") setForkFrom(sourceRecipe)
        }
      }

      setPartnerSource(resolvedSource)

      if (currentUser && resolvedSource) {
        const key =
          "partner-auth-complete:" + currentUser.id + ":" + resolvedSource
        if (!sessionStorage.getItem(key)) {
          await logEvent("partner_auth_complete", null, resolvedSource)
          sessionStorage.setItem(key, "1")
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", currentUser.id)
          .maybeSingle()

        if (!active) return
        if (profile && !profile.display_name?.trim()) {
          const providerName = String(
            currentUser.user_metadata?.full_name ||
              currentUser.user_metadata?.name ||
              "",
          ).trim()
          setIdentityDefault(providerName)
          setNeedsIdentity(true)
        }
      }

      if (active) setIsLoading(false)
    }

    checkUser().catch((error) => {
      console.error("Recipe entry initialization failed:", error)
      if (active) {
        if (authChecked) setOnboardingError("Recipe 작성 화면을 준비하지 못했습니다.")
        else setAuthError(true)
        setIsLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [router, supabase])

  if (isLoading) return <PageLoading />
  if (authError) {
    return (
      <div className="px-3 pt-3">
        <StateSheet
          headingLevel="h1"
          title="로그인 상태를 확인할 수 없습니다"
          body="인터넷 연결을 확인하고 다시 시도해 주세요."
          action={<Button type="button" onClick={() => window.location.reload()}>다시 시도</Button>}
        />
      </div>
    )
  }
  if (!user) return <CreateContentAuthPrompt contentType="recipe" />

  if (onboardingError) {
    return (
      <div className="px-3 pt-3">
        <StateSheet
          headingLevel="h1"
          title="Recipe 초안을 열 수 없습니다"
          body={onboardingError}
        />
      </div>
    )
  }

  if (partnerSource && needsIdentity) {
    return (
      <PartnerIdentityStep
        userId={user.id}
        source={partnerSource}
        initialName={identityDefault}
        onContinue={() => setNeedsIdentity(false)}
      />
    )
  }

  return (
    <RecipeForm
      userId={user.id}
      onNavigateBack={navigateBack}
      forkFrom={forkFrom}
      entrySource={partnerSource}
      onboardingDraft={onboardingDraft}
    />
  )
}
