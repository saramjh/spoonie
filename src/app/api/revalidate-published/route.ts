import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { revalidateDiscoveryPaths } from "@/features/discovery/data/revalidate-discovery"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validSecret(request: Request): boolean {
	const expected = process.env.PUSH_WEBHOOK_SECRET || ""
	const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
	if (!expected || !supplied) return false
	const a = Buffer.from(expected)
	const b = Buffer.from(supplied)
	return a.length === b.length && timingSafeEqual(a, b)
}

// 예약 공개 함수처럼 사용자 쿠키가 없는 내부 운영 작업이 검색 자산 캐시를 갱신할 때만 사용한다.
export async function POST(request: Request) {
	if (!validSecret(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
	const body = await request.json().catch(() => null)
	const itemId = typeof body?.itemId === "string" ? body.itemId : ""
	if (!UUID.test(itemId)) return NextResponse.json({ error: "invalid item" }, { status: 400 })

	const supabase = createSupabasePublicClient()
	const { data: item, error } = await supabase.from("items").select("user_id, tags").eq("id", itemId).eq("is_public", true).maybeSingle()
	if (error) return NextResponse.json({ error: "lookup failed" }, { status: 500 })
	if (!item) return NextResponse.json({ error: "not found" }, { status: 404 })
	const { data: profile } = await supabase.from("profiles").select("public_id").eq("id", item.user_id).maybeSingle()

	revalidateDiscoveryPaths({ itemId, profileIds: [item.user_id, profile?.public_id], tags: item.tags ?? [] })
	return NextResponse.json({ revalidated: true })
}
