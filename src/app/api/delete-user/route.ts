import { createClient } from "@supabase/supabase-js"
import { createSupabaseRouteHandlerClient } from "@/shared/infra/supabase-server"
import { NextResponse } from "next/server"

/**
 * Only remove Storage objects AFTER the self-delete transaction commits.
 * Use the server-only secret because the user's session can be revoked by then.
 */
async function cleanupDeletedUserImages(admin: { storage: ReturnType<typeof createClient>["storage"] }, userId: string) {
  const images = admin.storage.from("item-images")
  for (;;) {
    const { data: files, error } = await images.list(userId, { limit: 1000 })
    if (error) throw error
    const paths = (files ?? []).filter(file => file.id).map(file => userId + "/" + file.name)
    if (paths.length === 0) break
    const removed = await images.remove(paths)
    if (removed.error) throw removed.error
    if (paths.length < 1000) break
  }

  const avatars = admin.storage.from("avatars")
  const avatarPaths: string[] = []
  for (let offset = 0;; offset += 1000) {
    const { data: files, error } = await avatars.list("", { search: userId, limit: 1000, offset })
    if (error) throw error
    avatarPaths.push(...(files ?? []).filter(file => file.id && file.name.startsWith(userId)).map(file => file.name))
    if (!files || files.length < 1000) break
  }
  for (let offset = 0; offset < avatarPaths.length; offset += 1000) {
    const removed = await avatars.remove(avatarPaths.slice(offset, offset + 1000))
    if (removed.error) throw removed.error
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteHandlerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body?.userId && body.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fail before touching account data when the server cannot perform cleanup.
  const secret = process.env.SUPABASE_SECRET_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!secret || !url) {
    return NextResponse.json({ error: "탈퇴를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 })
  }

  try {
    const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
    const [imageProbe, avatarProbe] = await Promise.all([
      admin.storage.from("item-images").list(user.id, { limit: 1 }),
      admin.storage.from("avatars").list("", { search: user.id, limit: 1 }),
    ])
    if (imageProbe.error || avatarProbe.error) {
      return NextResponse.json({ error: "사진 저장소를 확인하지 못해 계정을 삭제하지 않았습니다." }, { status: 503 })
    }

    // The database transaction must succeed before any permanent object removal.
    const { error: deleteError } = await supabase.rpc("delete_user_data", { user_id_to_delete: user.id })
    if (deleteError) {
      console.error("Account deletion failed:", deleteError.message)
      return NextResponse.json({ error: "계정 데이터를 삭제하지 못했습니다." }, { status: 500 })
    }

    try {
      await cleanupDeletedUserImages(admin, user.id)
      return NextResponse.json({ message: "회원 탈퇴와 사진 삭제가 완료됐습니다." }, { status: 200 })
    } catch (cleanupError) {
      // Account is already gone. Never tell the user to retry account deletion.
      console.error("Account deleted but media cleanup failed:", cleanupError)
      return NextResponse.json({
        message: "계정은 삭제됐으나 사진 정리에 문제가 발생했습니다.",
        media_cleanup_pending: true,
      }, { status: 200 })
    }
  } catch (error) {
    console.error("Unhandled account deletion error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
