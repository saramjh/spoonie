import Link from 'next/link'

// Low-priority service information; no curator promotion in the app header.
export default function SiteFooter({ hasBottomNav }: { hasBottomNav: boolean }) {
  return (
    <footer className={`border-t border-border px-4 pt-4 text-ink-soft ${hasBottomNav ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-5"}`}>
      <nav aria-label="서비스 정보" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-meta">
        <Link href="/legal/privacy" className="underline-offset-4 hover:underline">개인정보처리방침</Link>
        <Link href="/legal/terms" className="underline-offset-4 hover:underline">이용약관</Link>
        <Link href="/legal/policy" className="underline-offset-4 hover:underline">운영정책</Link>
        <Link href="/curators" className="underline-offset-4 hover:underline">큐레이터 소개</Link>
      </nav>
    </footer>
  )
}
