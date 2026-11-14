"use client"

import Link from "next/link"
import { forwardRef, type ComponentProps } from "react"
import { signalNavigationStart } from "@/shared/lib/navigation"

/** Signal real Next.js navigations, after any caller has had a chance to cancel. */
const NavigationLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function NavigationLink(
  { href, onNavigate, ...props }, ref
) {
  return (
    <Link {...props} ref={ref} href={href} onNavigate={(event) => {
      let canceled = false
      onNavigate?.({ preventDefault: () => { canceled = true; event.preventDefault() } })
      if (!canceled) signalNavigationStart(typeof href === "string" ? href : href.pathname ?? "")
    }} />
  )
})

export default NavigationLink
