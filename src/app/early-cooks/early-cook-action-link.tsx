"use client"

import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"

type GtagWindow = Window & {
  gtag?: (type: "event", name: string, params?: Record<string, string>) => void
}

type Props = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode
  action: "start_recipeed" | "view_reference"
}

export default function EarlyCookActionLink({ children, action, ...props }: Props) {
  return (
    <Link {...props} onClick={() => {
      const query = new URLSearchParams(window.location.search)
      ;(window as GtagWindow).gtag?.("event", "early_cook_action", {
        action,
        campaign: query.get("utm_campaign") ?? "sco_early_cook_owned_v1",
        creative: query.get("utm_content") ?? "owned_early_cook",
      })
    }}>
      {children}
    </Link>
  )
}
