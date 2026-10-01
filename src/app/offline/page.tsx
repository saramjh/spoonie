import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-door px-3 pt-3">
      <section className="rounded-[3px] bg-paper px-5 py-6 shadow-sheet">
        <h1 className="text-xl font-bold text-ink">인터넷에 연결되어 있지 않아요</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          연결되면 다시 불러올게요. 전에 열어 본 레시피는 연결 없이도 볼 수 있어요.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">홈으로</Link>
        </Button>
      </section>
    </div>
  )
}
