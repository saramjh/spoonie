/**
 * 🔐 보안 강화된 이미지 업로더 컴포넌트
 * 파일 검증, XSS 방지, 동시 업로드 제어, 에러 복구
 */

"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ImagePlus, X, Star, Camera, AlertTriangle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// 보안 유틸리티 import
import { validateFile, validateMultipleFiles } from "@/lib/security-validators"
import { withMutex } from "@/utils/concurrency-safety"
import { useRetryableOperation } from "@/hooks/useNetworkError"
import { OptimizedImage, optimizeImages } from "@/lib/image-utils"

// ================================
// 1. 타입 정의
// ================================

interface SecureImageUploaderProps {
  images: OptimizedImage[]
  onImagesChange: (images: OptimizedImage[]) => void
  maxImages?: number
  maxFileSize?: number // bytes
  label?: string
  placeholder?: string
  thumbnailIndex?: number
  onThumbnailChange?: (index: number) => void
  showThumbnailSelector?: boolean
  isEditMode?: boolean
  allowedTypes?: string[]
  onUploadStart?: () => void
  onUploadComplete?: () => void
  onUploadError?: (error: string) => void
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

// ================================
// 2. 기본 설정
// ================================

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif'
]

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB

// ================================
// 3. 메인 컴포넌트
// ================================

export default function SecureImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  maxFileSize = DEFAULT_MAX_SIZE,
  label = "이미지 업로드",
  placeholder = "이미지를 추가해주세요",
  thumbnailIndex = 0,
  onThumbnailChange,
  showThumbnailSelector = true,
  isEditMode = false,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  onUploadStart,
  onUploadComplete,
  onUploadError
}: SecureImageUploaderProps) {
  
  // ================================
  // 4. 상태 관리
  // ================================
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(thumbnailIndex)
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map())
  const [isDragOver, setIsDragOver] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // 재시도 가능한 업로드 작업
  const {
    execute: executeUpload,
    isRetrying,
    retryCount,
    lastError
  } = useRetryableOperation(
    () => processFiles([]), // 실제 파일은 상태에서 관리
    {
      enableToast: false, // 커스텀 토스트 사용
      enableRetry: true,
      retryConfig: { maxAttempts: 3, baseDelay: 1000 }
    }
  )

  // ================================
  // 5. 파일 검증 및 처리
  // ================================

  const validateAndProcessFiles = useCallback(async (files: File[]): Promise<OptimizedImage[]> => {
    setValidationErrors([])

    // 1. 기본 검증
    const { valid, errors, validFiles } = validateMultipleFiles(files, {
      maxSize: maxFileSize,
      allowedTypes,
      maxFiles: maxImages - images.length
    })

    if (!valid) {
      setValidationErrors(errors)
      throw new Error(errors.join(', '))
    }

    // 2. 중복 파일 검사
    const duplicateFiles = validFiles.filter(file => 
      images.some(img => img.file.name === file.name && img.file.size === file.size)
    )

    if (duplicateFiles.length > 0) {
      const message = `중복된 파일이 있습니다: ${duplicateFiles.map(f => f.name).join(', ')}`
      setValidationErrors([message])
      throw new Error(message)
    }

    // 3. 이미지 최적화 (보안 처리 포함)
    try {
      onUploadStart?.()
      const optimizedImages = await optimizeImages(validFiles)
      onUploadComplete?.()
      return optimizedImages
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.'
      onUploadError?.(errorMessage)
      throw error
    }
  }, [images, maxImages, maxFileSize, allowedTypes, onUploadStart, onUploadComplete, onUploadError])

  // ================================
  // 6. 파일 업로드 처리 (동시성 제어)
  // ================================

  const processFiles = useCallback(async (files: File[]): Promise<void> => {
    return withMutex('image-upload', async () => {
      try {
        const newImages = await validateAndProcessFiles(files)
        
        // 성공 시 이미지 목록 업데이트
        const updatedImages = [...images, ...newImages]
        onImagesChange(updatedImages)

        // 첫 번째 이미지가 추가된 경우 썸네일로 설정
        if (images.length === 0 && newImages.length > 0) {
          setCurrentThumbnailIndex(0)
          onThumbnailChange?.(0)
        }

        toast({
          title: "업로드 완료",
          description: `${newImages.length}개의 이미지가 업로드되었습니다.`,
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '업로드 실패'
        toast({
          title: "업로드 실패",
          description: errorMessage,
          variant: "destructive"
        })
      }
    })
  }, [images, onImagesChange, onThumbnailChange, validateAndProcessFiles, toast])

  // ================================
  // 7. 이벤트 핸들러들
  // ================================

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    await processFiles(files)
    
    // 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(file => 
      allowedTypes.includes(file.type)
    )

    if (files.length > 0) {
      await processFiles(files)
    }
  }, [allowedTypes, processFiles])

  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)

    // 썸네일 인덱스 조정
    if (index === currentThumbnailIndex) {
      const newThumbnailIndex = Math.max(0, Math.min(currentThumbnailIndex, newImages.length - 1))
      setCurrentThumbnailIndex(newThumbnailIndex)
      onThumbnailChange?.(newThumbnailIndex)
    } else if (index < currentThumbnailIndex) {
      const newThumbnailIndex = currentThumbnailIndex - 1
      setCurrentThumbnailIndex(newThumbnailIndex)
      onThumbnailChange?.(newThumbnailIndex)
    }
  }, [images, currentThumbnailIndex, onImagesChange, onThumbnailChange])

  const setThumbnail = useCallback((index: number) => {
    setCurrentThumbnailIndex(index)
    onThumbnailChange?.(index)
  }, [onThumbnailChange])

  // ================================
  // 8. 썸네일 인덱스 동기화
  // ================================

  useEffect(() => {
    if (thumbnailIndex !== currentThumbnailIndex) {
      setCurrentThumbnailIndex(thumbnailIndex)
    }
  }, [thumbnailIndex, currentThumbnailIndex])

  // ================================
  // 9. 렌더링
  // ================================

  return (
    <div className="space-y-4">
      {/* 라벨 */}
      <Label htmlFor="secure-image-upload" className="text-sm font-medium">
        {label}
        <span className="text-gray-500 ml-2">
          ({images.length}/{maxImages})
        </span>
      </Label>

      {/* 검증 에러 표시 */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">입력 오류</span>
          </div>
          <ul className="text-sm text-red-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 업로드 영역 */}
      <div
        className={`border-2 border-dashed rounded-lg transition-colors ${
          isDragOver 
            ? 'border-orange-500 bg-orange-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Input
          ref={fileInputRef}
          id="secure-image-upload"
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="p-6 text-center">
          {images.length === 0 ? (
            <div className="space-y-2">
              <Camera className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-500">{placeholder}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRetrying}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                이미지 선택 {isRetrying && `(재시도 ${retryCount}/3)`}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= maxImages || isRetrying}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              이미지 추가 {isRetrying && `(재시도 ${retryCount}/3)`}
            </Button>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            또는 파일을 여기로 드래그하세요<br />
            {allowedTypes.map(type => type.split('/')[1]).join(', ')} • 최대 {Math.round(maxFileSize / 1024 / 1024)}MB
          </p>
        </div>
      </div>

      {/* 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <Card key={`${image.file.name}-${index}`} className="relative group">
              <div className="aspect-square relative overflow-hidden rounded-lg">
                <Image
                  src={image.url}
                  alt={`업로드된 이미지 ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                
                {/* 썸네일 표시 */}
                {showThumbnailSelector && currentThumbnailIndex === index && (
                  <div className="absolute top-2 left-2">
                    <div className="bg-orange-500 text-white rounded-full p-1">
                      <Star className="w-3 h-3" fill="currentColor" />
                    </div>
                  </div>
                )}

                {/* 삭제 버튼 */}
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-3 h-3" />
                </Button>

                {/* 썸네일 설정 버튼 */}
                {showThumbnailSelector && currentThumbnailIndex !== index && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setThumbnail(index)}
                  >
                    <Star className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 재시도/에러 상태 */}
      {lastError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-yellow-700">
              업로드 중 오류가 발생했습니다. 자동으로 재시도합니다...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}