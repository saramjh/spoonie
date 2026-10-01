import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 미리 만든 페이지를 즉시 다시 만든다.
// - { itemId }: 작성자가 글을 고치거나 지우거나 공개 범위를 바꿨을 때 → 그 글의 상세와 작성자 프로필
// - { profile: true }: 내 프로필(이름·사진·소개)을 바꿨을 때 → 내 프로필
// 로그인한 본인 것만 허용한다. 이미 지워진 글은 주인을 확인할 수 없지만, 다시 만들어도 "없는 글"이 될 뿐이라 허용한다.
export async function POST(request: Request) {
	const body = await request.json().catch(() => null)
	const itemId = typeof body?.itemId === "string" ? body.itemId : ""
	const profileOnly = body?.profile === true
	if (!profileOnly && !UUID.test(itemId)) return NextResponse.json({ error: "invalid item" }, { status: 400 })

	const supabase = await createSupabaseRouteHandlerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

	// 내 프로필 경로 (공개 아이디와 내부 아이디 두 주소 모두)
	const { data: me } = await supabase.from("profiles").select("public_id").eq("id", user.id).maybeSingle()
	const revalidateMyProfile = () => {
		revalidatePath(`/profile/${user.id}`)
		if (me?.public_id) revalidatePath(`/profile/${me.public_id}`)
	}
	if (profileOnly) {
		revalidateMyProfile()
		return NextResponse.json({ revalidated: true })
	}

	// 작성자는 RLS로 자기 비공개 글까지 읽을 수 있다. 다른 사람의 글이 보이면 거절한다
	const { data: item } = await supabase.from("items").select("user_id").eq("id", itemId).maybeSingle()
	if (item && item.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 })

	revalidatePath(`/recipes/${itemId}`)
	revalidatePath(`/posts/${itemId}`)
	revalidateMyProfile() // 내 프로필의 글 목록도 바뀐다
	return NextResponse.json({ revalidated: true })
}
