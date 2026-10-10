import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { OptimizedImage, optimizeImages } from "@/shared/infra/image-utils"
import { VARIANT_WIDTHS, variantPath } from "@/shared/infra/image-variants"
import { removeUploadedImages } from "@/shared/infra/item-images"

/**
 * 이미지 업로드 최적화 유틸리티
 * 사진마다 고유 경로를 만들고 최대 3개씩 병렬 처리한다
 */

interface UploadResult {
	url: string
	success: boolean
	error?: string
}

interface UploadProgress {
	uploaded: number
	total: number
	currentFile?: string
}

/** 매 게시물의 새 사진에는 독립된 저장소 URL을 생성한다. */
async function uploadSingleImage(image: OptimizedImage, userId: string, bucketId: string): Promise<UploadResult> {
  try { return await performUpload(image, userId, bucketId) }
  catch (error) {
    console.error('Image upload failed:', error)
    return { url: '', success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/** 실제 업로드 수행 */
async function performUpload(
	image: OptimizedImage,
	userId: string,
	bucketId: string
): Promise<UploadResult> {
	const supabase = createSupabaseBrowserClient()

	// 파일 삭제·교체가 다른 글/계정에 영향을 주지 않도록 고유 경로로 업로드한다
	const fileName = `${userId}/${crypto.randomUUID()}.jpg`

	const { error: uploadError } = await supabase.storage
		.from(bucketId)
		.upload(fileName, image.file, {
			cacheControl: '31536000', // 1년 캐시
			upsert: false // 중복 업로드 방지
		})

	if (uploadError) {
		throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
	}
	try {
		await uploadVariants(bucketId, fileName, image.file)
	} catch (error) {
		// 최적화 버전이 끝내 만들어지지 않으면 미완성 이미지 자산을 게시하지 않는다.
		await supabase.storage.from(bucketId).remove([fileName, ...VARIANT_WIDTHS.map((width) => variantPath(fileName, width))])
		throw error
	}

	const { data: publicUrlData } = supabase.storage
		.from(bucketId)
		.getPublicUrl(fileName)

	return { url: publicUrlData.publicUrl, success: true }
}

/**
 * 병렬 이미지 업로드 (최대 3개 동시 처리)
 */
export async function uploadImagesOptimized(
	images: OptimizedImage[],
	userId: string,
	bucketId: string,
	onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult[]> {
	const MAX_CONCURRENT = 3 // 동시 업로드 제한
	const results: UploadResult[] = []
	let completed = 0


	// 청크 단위로 병렬 처리
	for (let i = 0; i < images.length; i += MAX_CONCURRENT) {
		const chunk = images.slice(i, i + MAX_CONCURRENT)
		const chunkPromises = chunk.map(async (image, index) => {
			const globalIndex = i + index
			onProgress?.({
				uploaded: completed,
				total: images.length,
				currentFile: `이미지 ${globalIndex + 1}`
			})

			const result = await uploadSingleImage(image, userId, bucketId)
			completed++

			onProgress?.({
				uploaded: completed,
				total: images.length
			})

			return result
		})

		const chunkResults = await Promise.allSettled(chunkPromises)

		// 결과 수집 (실패한 업로드도 포함)
		chunkResults.forEach(result => {
			if (result.status === 'fulfilled') {
				results.push(result.value)
			} else {
				results.push({
					url: '',
					success: false,
					error: result.reason?.message || 'Upload failed'
				})
			}
		})
	}






	// 실패한 배치에서는 이미 성공한 사진도 게시물에 연결되지 않는다.
	// 이 요청에서 새로 만든 URL만 삭제하고 원래의 실패 결과를 호출자에게 보낸다.
	if (results.some((result) => !result.success)) {
		try {
			await removeUploadedImages(results.filter((result) => result.success).map((result) => result.url))
		} catch (error) {
			console.error("Failed to clean up partially uploaded images:", error)
		}
	}
	return results
}

/**
 * 크기별 버전(400px, 800px)을 원본 옆에 올린다.
 * 각 variant는 최대 3번 재시도한다. 끝내 실패하면 throw하여 새 게시물이
 * "원본만 있고 responsive variant가 없는" 불완전 상태로 저장되지 않게 한다.
 */
export async function uploadVariants(bucketId: string, path: string, file: File): Promise<void> {
	const supabase = createSupabaseBrowserClient()
	const failures: string[] = []

	await Promise.all(
		VARIANT_WIDTHS.map(async (width) => {
			let lastError: unknown = null
			for (let attempt = 1; attempt <= 3; attempt += 1) {
				try {
					const [variant] = await optimizeImages([file], width, 0.78)
					const { error } = await supabase.storage.from(bucketId).upload(variantPath(path, width), variant.file, {
						cacheControl: "31536000",
						contentType: "image/jpeg",
						upsert: true,
					})
					if (error) throw error
					return
				} catch (error) {
					lastError = error
					if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 150 * attempt))
				}
			}
			failures.push(`${width}px: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
		})
	)

	if (failures.length > 0) {
		console.error("image variant pipeline failed", { path, failures })
		throw new Error(`이미지 최적화 버전 생성 실패: ${failures.join(" / ")}`)
	}
}
