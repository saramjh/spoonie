"use client"

import { useState, useRef, useCallback, useEffect, useId } from "react"
import Image from "next/image"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Plus, X, Images } from "lucide-react"
import { optimizeImages, isValidImageType, isValidFileSize, getImageProcessingMessage, OptimizedImage } from "@/shared/infra/image-utils"
import { useToast } from "@/hooks/use-toast"
import { CENTER_FOCAL, coverObjectPosition, normalizeCoverFocal, type CoverFocal } from "@/features/recipe/domain/cover-focal"

interface ImageUploaderProps {
	images: OptimizedImage[]
	onImagesChange: (images: OptimizedImage[]) => void
	maxImages?: number
	label?: string
	// 작성 중인 글의 종류. 사진 칸과 피드 미리보기는 둘 다 3:2다.
	frame?: "recipe" | "recipeed"
	placeholder?: string
	thumbnailIndex?: number
	onThumbnailChange?: (index: number) => void
	focalPoint?: CoverFocal
	onFocalPointChange?: (point: CoverFocal) => void
	showThumbnailSelector?: boolean

}

export default function ImageUploader({ images, onImagesChange, maxImages = 5, label = "이미지 업로드", placeholder = "이미지를 추가해주세요", thumbnailIndex = 0, onThumbnailChange, showThumbnailSelector = true, frame = "recipeed", focalPoint, onFocalPointChange }: ImageUploaderProps) {
	const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const onPickerKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if ((event.key === "Enter" || event.key === " ") && !isProcessing) {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }
	const { toast } = useToast()
	const [isProcessing, setIsProcessing] = useState(false)
	const [photoManagerOpen, setPhotoManagerOpen] = useState(false)
	const focus = normalizeCoverFocal(focalPoint)
	const adjustFocus = (event: React.PointerEvent<HTMLButtonElement>) => {
		if (!onFocalPointChange) return
		const rect = event.currentTarget.getBoundingClientRect()
		if (rect.width <= 0 || rect.height <= 0) return
		onFocalPointChange(normalizeCoverFocal({ x: Math.round((event.clientX - rect.left) / rect.width * 100), y: Math.round((event.clientY - rect.top) / rect.height * 100) }))
	}
	const latestImages = useRef(images)
	useEffect(() => { latestImages.current = images }, [images])
	const previousPreviews = useRef<Set<string>>(new Set())
	const mounted = useRef(false)
	
	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files || [])
			// 같은 사진을 다시 골라도 change 이벤트가 발생하도록 먼저 비운다.
			e.target.value = ""
			if (files.length === 0) return

			if (latestImages.current.length + files.length > maxImages) {
				toast({
					title: "업로드 제한",
					description: `최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`,
					variant: "destructive",
				})
				return
			}

			const invalidFiles = files.filter((file) => !isValidImageType(file) || !isValidFileSize(file))
			if (invalidFiles.length > 0) {
				toast({
					title: "파일 형식 오류",
					description: "JPG, PNG, WEBP 또는 기기에서 열 수 있는 HEIC 사진(10MB 이하)을 선택해 주세요.",
					variant: "destructive",
				})
				return
			}

			setIsProcessing(true)
			try {
				const optimizedImages = await optimizeImages(files)
				if (!mounted.current) {
					optimizedImages.forEach((image) => URL.revokeObjectURL(image.preview))
					return
				}
				// 사진은 저장할 때 올라간다. 여기서는 줄여서 미리 보여 주기만 하므로 알림을 띄우지 않는다 (나타난 사진이 피드백)
				const nextImages = [...latestImages.current, ...optimizedImages]
				latestImages.current = nextImages
				onImagesChange(nextImages)
			} catch (error) {
				console.error("Image optimization failed:", error)
				toast({
					title: "이미지 처리 실패",
					description: getImageProcessingMessage(error),
					variant: "destructive",
				})
			} finally {
				if (mounted.current) setIsProcessing(false)
			}

			if (fileInputRef.current) {
				fileInputRef.current.value = ""
			}
		},
		[maxImages, onImagesChange, toast, setIsProcessing]
	)

	const removeImage = useCallback(
		(index: number) => {
			const newImages = latestImages.current.filter((_, i) => i !== index)
			latestImages.current = newImages
			onImagesChange(newImages)

			if (onThumbnailChange) {
				const nextIndex = newImages.length === 0 || index === thumbnailIndex ? 0
					: index < thumbnailIndex ? thumbnailIndex - 1 : thumbnailIndex
				if (nextIndex !== thumbnailIndex) onThumbnailChange(nextIndex)
			}
			if (index === thumbnailIndex) onFocalPointChange?.({ ...CENTER_FOCAL })
	},
	[onImagesChange, thumbnailIndex, onThumbnailChange, onFocalPointChange]
	)

	const setThumbnail = useCallback(
		(index: number) => {
			// 대표 사진은 부르는 쪽(폼)이 가진다
			onThumbnailChange?.(index)
		},
		[onThumbnailChange]
	)

  const moveToFront = (index: number) => {
    if (index <= 0 || index >= latestImages.current.length || isProcessing) return
    const next = [...latestImages.current]
    const [moved] = next.splice(index, 1)
    next.unshift(moved)
    latestImages.current = next
    onImagesChange(next)
    const nextCover = thumbnailIndex === index ? 0 : thumbnailIndex < index ? thumbnailIndex + 1 : thumbnailIndex
    onThumbnailChange?.(nextCover)
    // Reordering the same cover must preserve its focal point.
    onFocalPointChange?.(focus)
  }

	// React Strict Mode의 개발용 effect 재실행에서 살아 있는 미리보기를 해제하지 않는다.
	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
			queueMicrotask(() => {
				if (mounted.current) return
				previousPreviews.current.forEach((url) => URL.revokeObjectURL(url))
				previousPreviews.current.clear()
			})
		}
	}, [])

	useEffect(() => {
		const current = new Set(images.map((img) => img.preview).filter((url) => url.startsWith("blob:")))
		// 유지 중인 사진의 URL은 해제하지 않는다. 제거된 사진만 정리한다.
		previousPreviews.current.forEach((url) => {
			if (!current.has(url)) URL.revokeObjectURL(url)
		})
		previousPreviews.current = current
	}, [images])

  return (
    <div className="mb-7" data-photo-composer={frame}>
      <div className="flex items-baseline justify-between">
        <Label className="text-label font-medium text-ink">{label}</Label>
        <span className="text-caption tabular-nums text-ink-soft">{images.length}/{maxImages}</span>
      </div>
      <ul className="mt-3 flex items-start gap-2 overflow-x-auto pb-1">
        {images.map((image, index) => (
          <li key={`${image.file.name}-${index}`} data-photo-slot="image" className="w-[92px] shrink-0">
            <button type="button" onClick={() => showThumbnailSelector && setThumbnail(index)} aria-pressed={showThumbnailSelector && index === thumbnailIndex} aria-label={index === thumbnailIndex ? `${index + 1}번째 사진 (대표 사진)` : `${index + 1}번째 사진을 대표 사진으로`} className="relative block aspect-[3/2] w-full overflow-hidden rounded-lg bg-muted">
              <Image src={image.preview} alt="" fill sizes="92px" className="object-cover" priority={index === 0} />
            </button>
            <span className="mt-1 block text-caption leading-[21px] text-ink-soft">{showThumbnailSelector && index === thumbnailIndex ? "대표 사진" : `사진 ${index + 1}`}</span>
          </li>
        ))}
        {images.length < maxImages && (
          <li data-photo-slot="add" className="w-[92px] shrink-0">
            <label htmlFor={fileInputId} role="button" tabIndex={isProcessing ? -1 : 0} aria-disabled={isProcessing} aria-label={placeholder} onKeyDown={onPickerKeyDown} className={`flex aspect-[3/2] w-full cursor-pointer items-center justify-center rounded-lg bg-paper-tint text-ink ${isProcessing ? "pointer-events-none opacity-60" : ""}`}>
              <Plus className="h-6 w-6" aria-hidden />
            </label>
            <span className="mt-1 block text-caption leading-[21px] text-ink-soft">{isProcessing ? "줄이는 중…" : "사진 추가"}</span>
          </li>
        )}
      </ul>
      {images.length === 0 && <p className="mt-2 text-caption text-ink-soft">{placeholder} · 최대 {maxImages}장</p>}
      {images.length > 0 && (
        <>
          <Button type="button" variant="outline" data-photo-management className="mt-3 gap-2" onClick={() => setPhotoManagerOpen(true)}>
            <Images className="h-5 w-5" aria-hidden />사진 순서·대표 사진 관리
          </Button>
          <Drawer open={photoManagerOpen} onOpenChange={setPhotoManagerOpen} shouldScaleBackground={false}>
            <DrawerContent className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto px-4 pb-5">
              <div className="flex items-center justify-between pt-3">
                <DrawerTitle className="text-title font-semibold text-ink">사진 관리</DrawerTitle>
                <Button type="button" size="icon" variant="ghost" aria-label="닫기" onClick={() => setPhotoManagerOpen(false)}>
                  <X className="h-5 w-5" aria-hidden />
                </Button>
              </div>
              <DrawerDescription className="mt-3 text-label leading-relaxed text-ink-soft">
                대표 사진을 선택하고 순서를 바꾸거나 사진을 더할 수 있어요.
              </DrawerDescription>
              <ul className="mt-4 divide-y divide-border">
            {images.map((image, index) => (
              <li key={`${image.file.name}-${index}`} className="flex items-center gap-3 py-3">
                <button type="button" onClick={() => setThumbnail(index)} aria-pressed={index === thumbnailIndex} aria-label={`${index + 1}번째 사진을 대표 사진으로`} className="relative aspect-[3/2] w-16 shrink-0 overflow-hidden rounded-lg"><Image src={image.preview} alt="" fill sizes="64px" className="object-cover" /></button>
                <div className="min-w-0 flex-1"><p className="text-label">{index === thumbnailIndex ? "대표 사진" : `사진 ${index + 1}`}</p><button type="button" onClick={() => moveToFront(index)} disabled={index === 0 || isProcessing} aria-label={`${index + 1}번째 사진 맨 앞으로`} className="min-h-11 text-caption text-ink-soft underline underline-offset-4 disabled:opacity-50">맨 앞으로</button></div>
                <button type="button" onClick={() => removeImage(index)} disabled={isProcessing} aria-label={`${index + 1}번째 사진 지우기`} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-soft"><X className="h-5 w-5" aria-hidden /></button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-soft">사진을 누르면 대표 사진이 돼요.</p>
					{showThumbnailSelector && onFocalPointChange && images[thumbnailIndex] && (
						<div className="mt-4">
							<p className="text-label font-medium text-ink">피드에서 보이는 모습 · 3:2</p>
							<button type="button" aria-label="대표 사진 위치 미리보기 및 조절" className={`relative mt-2 block w-full touch-none overflow-hidden rounded-[3px] bg-muted aspect-[3/2]`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); adjustFocus(event) }} onPointerMove={(event) => { if (event.buttons > 0) adjustFocus(event) }}>
								<Image src={images[thumbnailIndex].preview} alt="선택한 대표 사진의 피드 크롭" fill sizes="(max-width: 448px) 100vw, 448px" className="object-cover" style={{ objectPosition: coverObjectPosition(focus) }} />
							</button>
							<div className="mt-3 grid grid-cols-2 gap-4">
								<label className="text-meta text-ink-soft">좌우 위치
									<input aria-label="대표 사진 좌우 위치" className="mt-1 block w-full accent-ink" type="range" min="0" max="100" value={focus.x} onChange={(event) => onFocalPointChange({ ...focus, x: Number(event.target.value) })} />
								</label>
								<label className="text-meta text-ink-soft">위아래 위치
									<input aria-label="대표 사진 위아래 위치" className="mt-1 block w-full accent-ink" type="range" min="0" max="100" value={focus.y} onChange={(event) => onFocalPointChange({ ...focus, y: Number(event.target.value) })} />
								</label>
							</div>
							<p className="mt-1 text-meta text-ink-soft">사진을 움직이거나 조절해 중요한 부분이 피드에 보이도록 맞춰 주세요. 상세에서는 3:2 비율로 표시됩니다.</p>
						</div>
					)}
              <div className="mt-4 flex flex-col gap-3">
                {images.length < maxImages && (
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                    <Plus className="h-5 w-5" aria-hidden />사진 추가
                  </Button>
                )}
                <Button type="button" onClick={() => setPhotoManagerOpen(false)}>완료</Button>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}
      <input id={fileInputId} ref={fileInputRef} type="file" accept="image/*" multiple disabled={isProcessing} onChange={handleFileSelect} className="sr-only" tabIndex={-1} />
    </div>
  )
}
