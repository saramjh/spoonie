import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { OptimizedImage } from "@/lib/image-utils"

/**
 * 🚀 이미지 업로드 최적화 유틸리티
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

	const { data: publicUrlData } = supabase.storage
		.from(bucketId)
		.getPublicUrl(fileName)

	return { url: publicUrlData.publicUrl, success: true }
}

/**
 * 🚀 병렬 이미지 업로드 (최대 3개 동시 처리)
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
 * 기존 이미지 URL 유지 (수정 시 사용)
 */
export function processExistingImages(
	newImages: OptimizedImage[],
	existingUrls: string[]
): { imagesToUpload: OptimizedImage[]; finalUrls: string[] } {
	const imagesToUpload: OptimizedImage[] = []
	const finalUrls: string[] = []

	newImages.forEach((image, index) => {
		if (image.file.size > 0) {
			// 새로운 이미지 - 업로드 필요
			imagesToUpload.push(image)
			finalUrls.push('') // 업로드 후 채워질 예정
		} else {
			// 기존 이미지 - URL 재사용
			const existingUrl = existingUrls[index] || image.preview
			finalUrls.push(existingUrl)
		}
	})

	return { imagesToUpload, finalUrls }
}

/**
 * 이미지 업로드 통계 수집
 */
export class ImageUploadMetrics {
	private static metrics = {
		totalUploads: 0,
		successfulUploads: 0,
		cacheHits: 0,
		totalSizeMB: 0,
		averageUploadTime: 0,
		errors: 0
	}

	static recordUpload(
		sizeBytes: number, 
		uploadTimeMs: number, 
		success: boolean, 
		fromCache: boolean = false
	): void {
		this.metrics.totalUploads++
		this.metrics.totalSizeMB += sizeBytes / (1024 * 1024)

		if (success) {
			this.metrics.successfulUploads++
			
			if (fromCache) {
				this.metrics.cacheHits++
			} else {
				// 실제 업로드만 응답시간에 포함
				this.metrics.averageUploadTime = 
					(this.metrics.averageUploadTime * (this.metrics.successfulUploads - this.metrics.cacheHits - 1) + uploadTimeMs) / 
					(this.metrics.successfulUploads - this.metrics.cacheHits)
			}
		} else {
			this.metrics.errors++
		}
	}

	static getMetrics() {
		return {
			...this.metrics,
			successRate: this.metrics.totalUploads > 0 
				? (this.metrics.successfulUploads / this.metrics.totalUploads * 100).toFixed(1) + '%'
				: '0%',
			cacheHitRate: this.metrics.totalUploads > 0
				? (this.metrics.cacheHits / this.metrics.totalUploads * 100).toFixed(1) + '%'
				: '0%',
			averageSizeMB: this.metrics.totalUploads > 0
				? (this.metrics.totalSizeMB / this.metrics.totalUploads).toFixed(2)
				: '0'
		}
	}

	static reset(): void {
		this.metrics = {
			totalUploads: 0,
			successfulUploads: 0,
			cacheHits: 0,
			totalSizeMB: 0,
			averageUploadTime: 0,
			errors: 0
		}
	}
}

/**
 * 캐시 관리
 */
export const ImageCacheManager = {
	// 캐시 크기 확인
	getCacheSize(): number {
		return imageCache.size
	},

	// 캐시 정리 (메모리 관리)
	clearCache(): void {
		imageCache.clear()
		
	},

	// 특정 해시 캐시 제거
	removeFromCache(hash: string): void {
		imageCache.delete(hash)
	},

	// 캐시 상태 확인
	getCacheStats() {
		const activeUploads = uploadQueue.size
		const cacheEntries = imageCache.size
		
		return {
			cacheEntries,
			activeUploads,
			memoryEstimateMB: (cacheEntries * 50) / 1024 // 대략적인 메모리 사용량
		}
	}
} 