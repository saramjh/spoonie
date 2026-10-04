import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, GitFork, Search } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "../partner-action-link"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터 이용 안내 | Spoonie",
  description: "기존 요리 콘텐츠를 다시 꺼내 쓰기 좋은 Recipe로 남기는 Spoonie 크리에이터 안내.",
  alternates: { canonical: `${baseUrl}/partners/creators` },
  openGraph: {
    title: "요리 크리에이터 이용 안내 | Spoonie",
    description: "SNS·블로그에 있는 레시피 몇 개부터 Spoonie에 정리해 보세요.",
    url: `${baseUrl}/partners/creators`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const values = [
  {
    title: "다시 만들 수 있게",
    description: "재료·분량·조리 단계를 피드 밖에 흩어두지 않고 Recipe 하나로 정리합니다.",
    icon: BookOpen,
  },
  {
    title: "출처와 변형을 이어서",
    description: "참고한 Recipe와 새 Recipe 사이의 관계를 남길 수 있습니다.",
    icon: GitFork,
  },
  {
    title: "검색 가능한 내 요리 자산으로",
    description: "공개 Recipe는 작성자 프로필에 쌓이고 검색 가능한 콘텐츠가 됩니다.",
    icon: Search,
  },
]

export default function CreatorPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">For Cooking Creators</p>
          <h1 className="mt-2 text-display text-ink">이미 만든 레시피를<br />다시 꺼내 쓸 수 있게</h1>
          <p className="mt-4 text-body text-ink-soft">
            SNS나 블로그에 올린 요리 중 1~3개만 먼저 Spoonie Recipe로 옮겨보세요.
          </p>
          <PartnerActionLink
            href="/signup?next=%2Frecipes%2Fnew"
            segment="creator"
            action="signup_to_recipe"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            첫 Recipe 올리기
          </PartnerActionLink>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-value">
          <h2 id="creator-value" className="text-heading text-ink">Spoonie에 남는 것</h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {values.map(({ title, description, icon: Icon }) => (
              <div key={title} className="flex gap-3 py-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-ink" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0">
                  <p className="text-label text-ink">{title}</p>
                  <p className="mt-1 text-meta text-ink-soft">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <PartnerProof segment="creator" />

      </article>
    </div>
  )
}
