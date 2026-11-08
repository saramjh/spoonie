import Link from "next/link"
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/kit'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-paper">
      <PageHeader title="오프라인" />
      <section aria-labelledby="offline-title" className="mx-auto flex max-w-sm flex-col items-center px-4 pb-24 pt-16 text-center">
        <WifiOff aria-hidden className="h-10 w-10 text-ink-soft" strokeWidth={1.5} />
        <h2 id="offline-title" className="mt-5 text-heading text-ink">인터넷 연결을 확인해 주세요</h2>
        <p className="mt-2 text-label text-ink-soft">연결이 돌아오면 다시 시도해 주세요.</p>
        <Button asChild className="mt-16 h-12 w-full">
          <Link href="/">다시 시도</Link>
        </Button>
      </section>
    </div>
  )
}
