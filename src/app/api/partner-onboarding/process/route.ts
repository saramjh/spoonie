import "server-only"

import { NextResponse } from "next/server"

import { processDueOnboardingSources } from "@/features/onboarding/data/onboarding-admin"

function authorized(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET
  const auth = request.headers.get("authorization")
  return Boolean(secret && auth === "Bearer " + secret)
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const results = await processDueOnboardingSources(5)
    return NextResponse.json({ ok: true, processed: results.length, results })
  } catch (error) {
    console.error("Partner onboarding scheduled processing failed:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
