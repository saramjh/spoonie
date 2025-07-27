'use client'

import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
      <WifiOff className="w-24 h-24 text-gray-400 mb-6" />
      <h1 className="text-3xl font-bold text-gray-800 mb-4">오프라인 상태입니다.</h1>
      <p className="text-gray-600 mb-8">
        현재 인터넷 연결이 불안정하거나 끊어졌습니다. <br />
        일부 기능은 제한될 수 있지만, 이전에 방문했던 페이지는 계속 이용할 수 있습니다.
      </p>
      <Button asChild>
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </div>
  )
}
