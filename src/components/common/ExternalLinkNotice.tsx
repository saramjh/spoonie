'use client'

import { useEffect, useState } from 'react'
import { externalLinkDestination } from '@/shared/lib/external-text-links'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

/** All rendered external anchors (including original source links) use one warning. */
export default function ExternalLinkNotice() {
  const [destination, setDestination] = useState<URL | null>(null)

  useEffect(() => {
    function intercept(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return
      const anchor = event.target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement) || anchor.closest('[data-external-confirm]')) return
      const target = externalLinkDestination(anchor.href, window.location.href)
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
      setDestination(target)
    }
    document.addEventListener('click', intercept, true)
    return () => document.removeEventListener('click', intercept, true)
  }, [])

  return <AlertDialog open={destination !== null} onOpenChange={open => { if (!open) setDestination(null) }}>
    <AlertDialogContent data-external-confirm>
      <AlertDialogHeader>
        <AlertDialogTitle>외부 사이트로 이동합니다</AlertDialogTitle>
        <AlertDialogDescription>
          이 링크는 Spoonie 밖의 사이트로 연결됩니다. Spoonie가 해당 사이트의 안전성을 확인하거나 보장하지는 않습니다. 주소를 확인한 후 이동해 주세요.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <p className="break-all rounded-md bg-muted px-3 py-3 text-label font-medium text-ink" aria-label="이동할 사이트 주소">
        {destination?.hostname}{destination?.protocol === 'http:' ? ' · 암호화되지 않은 연결' : ''}
      </p>
      <AlertDialogFooter>
        <AlertDialogCancel>취소</AlertDialogCancel>
        <AlertDialogAction asChild>
          <a href={destination?.href ?? '#'} target="_blank" rel="noopener noreferrer nofollow" data-external-confirm>
            사이트로 이동
          </a>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
