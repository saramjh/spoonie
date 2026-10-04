import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { OptimizedImage, optimizeImages } from "@/shared/infra/image-utils"
import { VARIANT_WIDTHS, variantPath } from "@/shared/infra/image-variants"

/**
 * 이미지 업로드 최적화 유틸리티
 * 병렬 처리, 캐싱, 중복 제거로 서버 부담 최소화
 */

interface UploadResult {
	url: string
	success: boolean
	error?: string
	fromCache?: boolean
}

interface UploadProgress {
	uploaded: number
	total: number
	currentFile?: string
}

// 업로드된 이미지 캐시 (동일한 해시값의 이미지 중복 업로드 방지)
const imageCache = new Map<string, string>() // hash -> url
const uploadQueue = new Map<string, Promise<UploadResult>>() // 진행중인 업로드 추적

/**
 * 이미지 해시 생성 (중복 업로드 방지용)
 */
async function generateImageHash(file: File): Promise<string> {
	const buffer = await file.arrayBuffer()
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 개별 이미지 업로드 (캐시 및 중복 제거 포함)
 */
async function uploadSingleImage(
	image: OptimizedImage, 
	userId: string, 
	bucketId: string
): Promise<UploadResult> {
	try {
		// 이미지 해시 생성
		const imageHash = await generateImageHash(image.file)
		
		// 캐시된 URL이 있는지 확인
		const cachedUrl = imageCache.get(imageHash)
		if (cachedUrl) {
			
			return { url: cachedUrl, success: true, fromCache: true }
		}

		// 진행중인 업로드가 있는지 확인 (동일한 이미지 동시 업로드 방지)
		const ongoingUpload = uploadQueue.get(imageHash)
		if (ongoingUpload) {
			
			return await ongoingUpload
		}

		// 새로운 업로드 시작
		const uploadPromise = performUpload(image, userId, bucketId, imageHash)
		uploadQueue.set(imageHash, uploadPromise)

		try {
			const result = await uploadPromise
			
			// 성공 시 캐시에 저장
			if (result.success) {
				imageCache.set(imageHash, result.url)
				
			}

			return result
		} finally {
			// 업로드 큐에서 제거
			uploadQueue.delete(imageHash)
		}

	} catch (error) {
		console.error('❌ Image upload failed:', error)
		return { 
			url: '', 
			success: false, 
			error: error instanceof Error ? error.message : 'Unknown error' 
		}
	}
}

/**
 * 실제 업로드 수행
 */
async function performUpload(
	image: OptimizedImage, 
	userId: string, 
	bucketId: string, 
	imageHash: string
): Promise<UploadResult> {
	const supabase = createSupabaseBrowserClient()
	
	// 파일명에 해시 포함 (중복 방지 및 캐시 무효화 방지)
	const fileName = `${userId}/${Date.now()}-${imageHash.slice(0, 8)}.jpg`
	
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

	// const successCount = results.filter(r => r.success).length // Statistics not used
	// const cacheHits = results.filter(r => r.fromCache).length // Statistics not used
	
	

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
