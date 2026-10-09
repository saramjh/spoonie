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
const optimizeImage = (file: File, maxSide = 1280, quality = 0.8): Promise<OptimizedImage> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const releaseSource = () => URL.revokeObjectURL(url)

    img.onerror = () => {
      releaseSource()
      reject(new Error("이미지를 열 수 없습니다. 다른 사진 또는 JPG 파일을 선택해 주세요."))
    }
    img.onload = () => {
      releaseSource()
      try {
        const { width, height } = calculateNewDimensions(img.width, img.height, maxSide)
        if (width < 1 || height < 1) throw new Error("이미지 크기를 확인할 수 없습니다.")
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("이미지 처리 기능을 사용할 수 없습니다.")
        canvas.width = width
        canvas.height = height
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("사진 변환에 실패했습니다."))
            return
          }
          try {
            const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
              type: "image/jpeg", lastModified: Date.now(),
            })
            resolve({ file: optimizedFile, preview: URL.createObjectURL(optimizedFile), width, height })
          } catch (error) {
            reject(error)
          }
        }, "image/jpeg", quality)
      } catch (error) {
        reject(error)
      }
    }
    img.src = url
  })
}

/**
 * 새로운 이미지 크기 계산 (비율 유지)
 */
const calculateNewDimensions = (originalWidth: number, originalHeight: number, maxSide: number) => {
	// 긴 변을 maxSide 이하로 줄인다 (세로로 긴 사진도 과하게 크지 않게)
	const longest = Math.max(originalWidth, originalHeight)
	if (longest <= maxSide) {
		return { width: originalWidth, height: originalHeight }
	}
	const scale = maxSide / longest
	return {
		width: Math.round(originalWidth * scale),
		height: Math.round(originalHeight * scale),
	}
}

/**
 * 여러 이미지 파일을 최적화
 */
export const optimizeImages = async (files: File[], maxSide = 1280, quality = 0.8): Promise<OptimizedImage[]> => {
	const promises = files.map((file) => optimizeImage(file, maxSide, quality))
	return Promise.all(promises)
}

/**
 * 이미지 MIME 타입 확인
 */
export const isValidImageType = (file: File): boolean => {
	const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]
	return validTypes.includes(file.type)
}

/**
 * 최대 파일 크기 확인
 */
export const isValidFileSize = (file: File, maxSizeMB = 10): boolean => {
	const maxSizeBytes = maxSizeMB * 1024 * 1024
	return file.size <= maxSizeBytes
}
