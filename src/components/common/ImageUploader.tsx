"use client"

import { useState, useRef, useCallback, useEffect, useId } from "react"
import Image from "next/image"
import { Label } from "@/components/ui/label"
import { ImagePlus, X, Camera } from "lucide-react"
import { optimizeImages, isValidImageType, isValidFileSize, getImageProcessingMessage, OptimizedImage } from "@/shared/infra/image-utils"
import { useToast } from "@/hooks/use-toast"
import { CENTER_FOCAL, coverObjectPosition, normalizeCoverFocal, type CoverFocal } from "@/features/recipe/domain/cover-focal"

interface ImageUploaderProps {
	images: OptimizedImage[]
	onImagesChange: (images: OptimizedImage[]) => void
	maxImages?: number
	label?: string
	// 빈 상태 프레임 비율: 레시피 4:3, 레시피드 1:1 (DESIGN.md Interface Grammar 4)
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
		<div>
			<div className="flex items-baseline justify-between">
				<Label className="text-label font-medium text-ink">{label}</Label>
				<span className="text-meta tabular-nums text-ink-soft">
					{images.length}/{maxImages}
				</span>
			</div>

			{images.length > 0 ? (
				<>
					<ul className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
						{images.map((image, index) => {
							const isCover = showThumbnailSelector && index === thumbnailIndex
							return (
								<li key={`${image.file.name}-${index}`} className="relative h-24 w-24 flex-shrink-0">
									<button
										type="button"
										onClick={() => showThumbnailSelector && setThumbnail(index)}
										aria-pressed={isCover}
										aria-label={isCover ? `${index + 1}번째 사진 (대표 사진)` : `${index + 1}번째 사진을 대표 사진으로`}
										className={`relative block h-full w-full overflow-hidden rounded-[3px] bg-muted ${isCover ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
									>
										<Image src={image.preview} alt="" fill sizes="96px" className="object-cover" priority={index === 0} />
										{isCover && <span className="absolute bottom-1 left-1 rounded-[2px] bg-ink/85 px-1.5 py-0.5 text-micro text-paper">대표</span>}
									</button>
									<button
										type="button"
										onClick={() => removeImage(index)}
										aria-label={`${index + 1}번째 사진 지우기`}
										className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center"
									>
										<span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/85 text-paper">
											<X className="h-3.5 w-3.5" aria-hidden />
										</span>
									</button>
								</li>
							)
						})}
						{images.length < maxImages && (
							<li className="h-24 w-24 flex-shrink-0">
								<label
                  htmlFor={fileInputId}
                  role="button"
                  tabIndex={isProcessing ? -1 : 0}
                  aria-disabled={isProcessing}
                  onKeyDown={onPickerKeyDown}
									className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-[3px] border border-dashed border-ink/30 text-meta text-ink-soft ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
								>
									<ImagePlus className="h-5 w-5" aria-hidden />
									{isProcessing ? "줄이는 중" : "추가"}
								</label>
							</li>
						)}
					</ul>
					{showThumbnailSelector && images.length > 1 && <p className="mt-1 text-meta text-ink-soft">사진을 누르면 대표 사진이 돼요.</p>}
					{showThumbnailSelector && onFocalPointChange && images[thumbnailIndex] && (
						<div className="mt-4">
							<p className="text-label font-medium text-ink">피드에서 보이는 모습 · {frame === "recipe" ? "4:3" : "1:1"}</p>
							<button type="button" aria-label="대표 사진 위치 미리보기 및 조절" className={`relative mt-2 block w-full touch-none overflow-hidden rounded-[3px] bg-muted ${frame === "recipe" ? "aspect-[4/3]" : "aspect-square"}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); adjustFocus(event) }} onPointerMove={(event) => { if (event.buttons > 0) adjustFocus(event) }}>
								<Image src={images[thumbnailIndex].preview} alt="선택한 대표 사진의 4:3 피드 크롭" fill sizes="(max-width: 448px) 100vw, 448px" className="object-cover" style={{ objectPosition: coverObjectPosition(focus) }} />
							</button>
							<div className="mt-3 grid grid-cols-2 gap-4">
								<label className="text-meta text-ink-soft">좌우 위치
									<input aria-label="대표 사진 좌우 위치" className="mt-1 block w-full accent-ink" type="range" min="0" max="100" value={focus.x} onChange={(event) => onFocalPointChange({ ...focus, x: Number(event.target.value) })} />
								</label>
								<label className="text-meta text-ink-soft">위아래 위치
									<input aria-label="대표 사진 위아래 위치" className="mt-1 block w-full accent-ink" type="range" min="0" max="100" value={focus.y} onChange={(event) => onFocalPointChange({ ...focus, y: Number(event.target.value) })} />
								</label>
							</div>
							<p className="mt-1 text-meta text-ink-soft">사진을 움직이거나 조절해 중요한 부분이 피드에 보이도록 맞춰 주세요. 상세에서는 원본 전체가 보입니다.</p>
						</div>
					)}
				</>
			) : (
				<label
          htmlFor={fileInputId}
          role="button"
          tabIndex={isProcessing ? -1 : 0}
          aria-disabled={isProcessing}
          onKeyDown={onPickerKeyDown}
					className={`mt-2 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-ink/30 bg-muted text-ink-soft ${frame === "recipe" ? "aspect-[4/3]" : "aspect-square"} ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
				>
					<Camera className="h-8 w-8" aria-hidden />
					<span className="text-label font-medium text-ink">{isProcessing ? "사진을 줄이는 중" : placeholder}</span>
					<span className="text-meta">최대 {maxImages}장, 올릴 때 자동으로 줄여요</span>
				</label>
			)}

			<input id={fileInputId} ref={fileInputRef} type="file" accept="image/*" multiple disabled={isProcessing} onChange={handleFileSelect} className="sr-only" tabIndex={-1} />
		</div>
	)
}
