import Link from "@/components/kit/NavigationLink"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/kit"

export default function NotFound() {
  return (
    <div data-app-not-found className="min-h-screen bg-paper">
      <PageHeader title="404 · 없는 글" />
      <section aria-labelledby="not-found-title" className="mx-auto flex max-w-sm flex-col items-center px-4 pb-24 pt-16 text-center">
        <Search aria-hidden className="h-10 w-10 text-ink-soft" strokeWidth={1.5} />
        <h2 id="not-found-title" className="mt-5 text-heading text-ink">이 페이지를 찾을 수 없어요</h2>
        <p className="mt-2 text-label text-ink-soft">주소가 바뀌었거나 글이 삭제되었을 수 있어요.</p>
        <Button asChild className="mt-5"><Link href="/">홈으로</Link></Button>
      </section>
    </div>
  )
}
