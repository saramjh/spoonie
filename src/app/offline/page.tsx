import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StateSheet } from "@/components/kit"

export default function OfflinePage() {
  return (
    <div className="min-h-screen px-3 pt-3">
      <StateSheet headingLevel="h1" title="인터넷에 연결되어 있지 않아요" body="연결되면 다시 불러올게요. 전에 열어 본 레시피는 연결 없이도 볼 수 있어요." action={<Button asChild><Link href="/">홈으로</Link></Button>} />
    </div>
  )
}
