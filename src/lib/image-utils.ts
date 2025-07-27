// 이미지 품질 및 사이즈 최적화 유틸리티

export interface OptimizedImage {
	file: File
	preview: string
	width: number
	height: number
}

/**
 * 이미지 파일을 최적화하여 품질과 크기를 조절합니다
 */
export const optimizeImage = (file: File, maxWidth = 800, quality = 0.8): Promise<OptimizedImage> => {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement("canvas")
		const ctx = canvas.getContext("2d")
		const img = new Image()

		img.onload = () => {
			// 비율 유지하며 크기 조절
			const { width, height } = calculateNewDimensions(img.width, img.height, maxWidth)

			canvas.width = width
			canvas.height = height

			if (!ctx) {
				reject(new Error("Canvas context not available"))
				return
			}

			// 고품질 이미지 렌더링
			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = "high"
			ctx.drawImage(img, 0, 0, width, height)

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Failed to create blob"))
						return
					}

					const optimizedFile = new File([blob], file.name, {
						type: "image/jpeg",
						lastModified: Date.now(),
					})

					const preview = URL.createObjectURL(optimizedFile)

					resolve({
						file: optimizedFile,
						preview,
						width,
						height,
					})
				},
				"image/jpeg",
				quality
			)
		}

		img.onerror = () => reject(new Error("Failed to load image"))
		img.src = URL.createObjectURL(file)
	})
}

/**
 * 새로운 이미지 크기 계산 (비율 유지)
 */
const calculateNewDimensions = (originalWidth: number, originalHeight: number, maxWidth: number) => {
	if (originalWidth <= maxWidth) {
		return { width: originalWidth, height: originalHeight }
	}

	const ratio = originalHeight / originalWidth
	return {
		width: maxWidth,
		height: Math.round(maxWidth * ratio),
	}
}

/**
 * 여러 이미지 파일을 최적화
 */
export const optimizeImages = async (files: File[], maxWidth = 800, quality = 0.8): Promise<OptimizedImage[]> => {
	const promises = files.map((file) => optimizeImage(file, maxWidth, quality))
	return Promise.all(promises)
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 변환
 */
export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes"

	const k = 1024
	const sizes = ["Bytes", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

/**
 * 이미지 MIME 타입 확인
 */
export const isValidImageType = (file: File): boolean => {
	const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
	return validTypes.includes(file.type)
}

/**
 * 최대 파일 크기 확인
 */
export const isValidFileSize = (file: File, maxSizeMB = 5): boolean => {
	const maxSizeBytes = maxSizeMB * 1024 * 1024
	return file.size <= maxSizeBytes
}
