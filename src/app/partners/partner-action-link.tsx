"use client"

import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"

type GtagWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => void
}

type PartnerActionLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode
  segment: "creator" | "brand" | "hub"
  action: string
}

export default function PartnerActionLink({
  children,
  segment,
  action,
  onClick,
  ...props
}: PartnerActionLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        ;(window as GtagWindow).gtag?.("event", "partner_action", {
          partner_segment: segment,
          partner_action: action,
        })
        onClick?.(event)
      }}
    >
      {children}
    </Link>
  )
}
