import type { Metadata } from "next"
import Link from "@/components/kit/NavigationLink"
import { PageHeader, StateSheet } from "@/components/kit"
import { buttonVariants } from "@/components/ui/button"
import { loadUserOnboardingRequests } from "@/features/onboarding/data/onboarding-admin"
import { authEntryHref } from "@/shared/lib/partner-entry"
import { createSupabaseServerComponentClient } from "@/shared/infra/supabase-server"
import PartnerOnboardingForm from "../../partner-onboarding-form"

export const metadata: Metadata = {
  title: "크리에이터 초기 이관 | Spoonie",
  robots: { index: false, follow: false },
}

const next = "/partners/creators/import"

export default async function CreatorImportPage() {
  const supabase = await createSupabaseServerComponentClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  const authUnavailable = error && error.name !== "AuthSessionMissingError"
  const requests = user && !authUnavailable
    ? (await loadUserOnboardingRequests(user.id)).filter(request => request.actorType === "creator")
    : []

  return (
    <div className="min-h-screen bg-paper">
      <PageHeader title="크리에이터 초기 이관" />
      <section aria-labelledby="creator-import-intro" className="px-4 py-6">
        <h2 id="creator-import-intro" className="text-3xl font-bold leading-tight tracking-tight text-ink">인스타에 올린 레시피,<br />다시 적지 마세요.</h2>
        <p className="mt-4 text-body text-ink-soft">기존 Instagram 요리 콘텐츠에서 확인할 수 있는 내용을 레시피 초안으로 정리해 드려요.</p>
        <p className="mb-4 mt-3 rounded-lg bg-paper-tint px-3 py-2 text-caption text-ink">내 계정의 비공개 초안 · 공개는 직접 선택</p>
        {authUnavailable ? (
          <StateSheet title="로그인 상태를 확인하지 못했어요" body="잠시 후 다시 시도해 주세요. 입력이나 자료 제출은 진행하지 않았어요." action={<Link href={next} className={buttonVariants({ variant: "outline" })}>다시 확인하기</Link>} />
        ) : user ? (
          <PartnerOnboardingForm actorType="creator" initialRequests={requests} />
        ) : (
          <div className="space-y-3">
            <Link href={authEntryHref("/signup", next, "partner_creator")} className={buttonVariants({ className: "w-full" })}>계정 만들고 이어하기</Link>
            <Link href={authEntryHref("/login", next, "partner_creator")} className={buttonVariants({ variant: "outline", className: "w-full" })}>로그인하고 이어하기</Link>
          </div>
        )}
        <details className="mt-6 border-t border-border">
          <summary className="min-h-11 cursor-pointer py-3 text-label font-medium text-ink">공개되기 전에 확인할 수 있나요?</summary>
          <p className="pb-4 text-label text-ink-soft">내 계정의 비공개 초안으로 준비해요. 내용을 확인하고 공개 여부를 직접 정할 수 있어요.</p>
        </details>
        <details className="border-b border-t border-border">
          <summary className="min-h-11 cursor-pointer py-3 text-label font-medium text-ink">어떤 자료를 제출하나요?</summary>
          <p className="pb-4 text-label text-ink-soft">게시할 권한이 있는 Instagram 요리 게시물이나 릴스 주소를 한 줄에 하나씩 보내 주세요.</p>
        </details>
      </section>
    </div>
  )
}
