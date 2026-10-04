import "server-only"

import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { cleanInquiryValue, type InquiryPayload, validatePartnerInquiry } from "./validation"

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true

  try {
    const requestUrl = new URL(request.url)
    const originUrl = new URL(origin)
    if (originUrl.origin === requestUrl.origin) return true
    if (originUrl.hostname === "spoonie.kr" || originUrl.hostname === "www.spoonie.kr") return true
    return originUrl.hostname === "127.0.0.1" || originUrl.hostname === "localhost"
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 })
  }

  const contentLength = Number(request.headers.get("content-length") || "0")
  if (contentLength > 20_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  const body = (await request.json().catch(() => null)) as InquiryPayload | null
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  if (cleanInquiryValue(body.website)) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const inquiry = validatePartnerInquiry(body)
  if (!inquiry) {
    return NextResponse.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !secretKey) {
    console.error("Partner inquiry server is missing Supabase configuration")
    return NextResponse.json({ error: "문의 접수 서버를 사용할 수 없습니다." }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from("partner_inquiries").insert(inquiry)
  if (error) {
    console.error("Partner inquiry insert failed:", error.message)
    return NextResponse.json({ error: "문의를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
