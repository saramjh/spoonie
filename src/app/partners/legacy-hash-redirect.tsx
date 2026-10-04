"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function legacyPartnerRoute(hash: string): "/partners/creators" | "/partners/brands" | null {
  if (hash === "#creators") return "/partners/creators"
  if (hash === "#brands") return "/partners/brands"
  return null
}

export default function LegacyPartnerHashRedirect() {
  const router = useRouter()

  useEffect(() => {
    const target = legacyPartnerRoute(window.location.hash)
    if (!target) return
    router.replace(`${target}${window.location.search}`)
  }, [router])

  return null
}
