import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { VARIANT_WIDTHS, variantPath } from "@/shared/infra/image-variants"

// 글에서 빠진 사진 파일을 저장소에서 지운다 (원본과 크기별 버전).
// 저장소 정책상 본인 폴더의 파일만 지워지므로 다른 사람의 사진은 건드릴 수 없다.
// 실패해도 화면 동작에는 영향이 없다. 남은 파일은 매주 서버가 정리한다 (netlify/functions/sweep-orphan-images.js).
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS || "item-images"
const PUBLIC_MARK = `/storage/v1/object/public/${BUCKET}/`

function toPaths(urls: Array<string | null | undefined>): string[] {
	const paths = new Set<string>()
	for (const url of urls) {
		if (!url || !url.includes(PUBLIC_MARK)) continue
		const path = decodeURIComponent(url.split(PUBLIC_MARK)[1].split("?")[0])
		paths.add(path)
		VARIANT_WIDTHS.forEach((w) => paths.add(variantPath(path, w)))
	}
	return [...paths]
}

/** 실패한 업로드 배치처럼 즉시 정리가 필요할 때 완료까지 기다린다. */
export async function removeUploadedImages(urls: Array<string | null | undefined>, supabase: ReturnType<typeof createSupabaseBrowserClient> = createSupabaseBrowserClient()): Promise<void> {
	const paths = toPaths(urls)
	if (paths.length === 0) return
	const { error } = await supabase.storage.from(BUCKET).remove(paths)
	if (error) throw error
}

/** DB 저장이 완료되지 않은 경우 이번 요청의 신규 사진만 제거한다. */
export async function cleanupUncommittedImages(
  newUrls: string[],
  state: { dbSaveStarted: boolean; dbCommitted: boolean; error: unknown },
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
): Promise<void> {
  if (state.dbCommitted || newUrls.length === 0) return
  // 커밋 후 응답이 유실됐을 수 있다. DB의 명시적 SQLSTATE 거절인 경우에만 정리한다.
  if (state.dbSaveStarted) {
    const cause = state.error instanceof Error ? state.error.cause : null
    const code = (cause as { code?: unknown } | null)?.code
    if (typeof code !== "string" || !/^(?:[0-9A-OQ-Z][0-9A-Z]{4}|P[0-9][0-9A-Z]{3})$/.test(code)) {
      console.warn("Keeping uploaded images after an uncertain database response")
      return
    }
  }
  try {
    await removeUploadedImages(newUrls, supabase)
  } catch (error) {
    // 저장소 정리 실패가 작성 오류나 IndexedDB 초안 복원을 가리지 않게 한다.
    console.error("Failed to clean up images after saving failed:", error)
  }
}

export function removeItemImages(urls: Array<string | null | undefined>) {
	const paths = toPaths(urls)
	if (paths.length === 0) return
	createSupabaseBrowserClient()
		.storage.from(BUCKET)
		.remove(paths)
		.catch(() => {})
}

// 고친 뒤 더 이상 쓰지 않는 사진 = 이전 사진 중 새 목록에 없는 것
export function removeDroppedImages(before: Array<string | null | undefined>, after: Array<string | null | undefined>) {
	const keep = new Set(after.filter(Boolean))
	removeItemImages(before.filter((url) => url && !keep.has(url)))
}

// 지우기 전에 글이 쓰는 사진 주소를 모은다 (대표 사진 + 단계 사진)
export async function collectItemImageUrls(supabase: SupabaseClient, itemIds: string[]): Promise<string[]> {
	if (itemIds.length === 0) return []
	const [{ data: items }, { data: steps }] = await Promise.all([
		supabase.from("items").select("image_urls").in("id", itemIds),
		supabase.from("instructions").select("image_url").in("item_id", itemIds),
	])
	return [...(items || []).flatMap((i) => i.image_urls || []), ...(steps || []).map((s) => s.image_url)].filter(Boolean)
}
