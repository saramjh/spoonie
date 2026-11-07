"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// The topic page has a public server-side data dependency. A transient
// failure must preserve the approved screen, not expose Next's raw 500 UI.
// The error boundary does not convert a backend failure into a false 404.
export default function TopicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[55dvh] max-w-md flex-col items-center px-5 pb-24 pt-16 text-center" role="alert">
      <AlertTriangle className="h-10 w-10 text-ink-soft" strokeWidth={1.5} aria-hidden />
      <h1 className="mt-5 text-heading font-semibold text-ink">불러오지 못했어요</h1>
      <p className="mt-2 text-label text-ink-soft">잠시 후 다시 시도해 주세요.</p>
      <Button type="button" className="mt-10 h-12 w-full" onClick={reset}>다시 시도</Button>
      <Button asChild variant="link" className="mt-2"><Link href="/">홈으로</Link></Button>
    </section>
  )
}
