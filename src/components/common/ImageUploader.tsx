"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImagePlus, X, Camera } from "lucide-react"
import { optimizeImages, isValidImageType, isValidFileSize, OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"

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
	showThumbnailSelector?: boolean

}

export default function ImageUploader({ images, onImagesChange, maxImages = 5, label = "이미지 업로드", placeholder = "이미지를 추가해주세요", thumbnailIndex = 0, onThumbnailChange, showThumbnailSelector = true, frame = "recipeed" }: ImageUploaderProps) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const { toast } = useToast()
	const [isProcessing, setIsProcessing] = useState(false)
	
	// SSA: 썸네일 인덱스 동기화를 위한 내부 상태
	const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(thumbnailIndex)
	
	// SSA: thumbnailIndex prop 변경 감지 및 동기화
	useEffect(() => {
		if (thumbnailIndex !== currentThumbnailIndex) {
	
			setCurrentThumbnailIndex(thumbnailIndex)
		}
	}, [thumbnailIndex, currentThumbnailIndex])

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(e.target.files || [])
			if (files.length === 0) return

			if (images.length + files.length > maxImages) {
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
					description: "JPG, PNG, WEBP 형식의 10MB 이하 이미지만 업로드 가능합니다.",
					variant: "destructive",
				})
				return
			}

			setIsProcessing(true)
			try {
				const optimizedImages = await optimizeImages(files)
				// 사진은 저장할 때 올라간다. 여기서는 줄여서 미리 보여 주기만 하므로 알림을 띄우지 않는다 (나타난 사진이 피드백)
				onImagesChange([...images, ...optimizedImages])
			} catch (error) {
				console.error("Image optimization failed:", error)
				toast({
					title: "이미지 처리 실패",
					description: "이미지 처리 중 오류가 발생했습니다.",
					variant: "destructive",
				})
			} finally {
				setIsProcessing(false)
			}

			if (fileInputRef.current) {
				fileInputRef.current.value = ""
			}
		},
		[images, maxImages, onImagesChange, toast]
	)

	const removeImage = useCallback(
		(index: number) => {
			const newImages = images.filter((_, i) => i !== index)
			onImagesChange(newImages)

					if (onThumbnailChange && currentThumbnailIndex >= newImages.length && newImages.length > 0) {
			onThumbnailChange(0)
		}
	},
	[images, onImagesChange, currentThumbnailIndex, onThumbnailChange]
	)

	const setThumbnail = useCallback(
		(index: number) => {
			// Debug: Setting thumbnail index
			setCurrentThumbnailIndex(index)
			if (onThumbnailChange) {
				onThumbnailChange(index)
			}
		},
		[onThumbnailChange]
	)

	useEffect(() => {
		return () => {
			images.forEach((img) => URL.revokeObjectURL(img.preview))
		}
	}, [images])

	return (
		<div>
			<div className="flex items-baseline justify-between">
				<Label className="text-sm font-medium text-ink">{label}</Label>
				<span className="text-sm tabular-nums text-ink-soft">
					{images.length}/{maxImages}
				</span>
			</div>

			{images.length > 0 ? (
				<>
					<ul className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
						{images.map((image, index) => {
							const isCover = showThumbnailSelector && index === currentThumbnailIndex
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
										{isCover && <span className="absolute bottom-1 left-1 rounded-[2px] bg-ink/85 px-1.5 py-0.5 text-[11px] font-bold text-paper">대표</span>}
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
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									disabled={isProcessing}
									className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[3px] border border-dashed border-ink/30 text-sm text-ink-soft"
								>
									<ImagePlus className="h-5 w-5" aria-hidden />
									{isProcessing ? "줄이는 중" : "추가"}
								</button>
							</li>
						)}
					</ul>
					{showThumbnailSelector && images.length > 1 && <p className="mt-1 text-[13px] text-ink-soft">사진을 누르면 대표 사진이 돼요.</p>}
				</>
			) : (
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={isProcessing}
					className={`mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-ink/30 bg-muted text-ink-soft ${frame === "recipe" ? "aspect-[4/3]" : "aspect-square"}`}
				>
					<Camera className="h-8 w-8" aria-hidden />
					<span className="text-[15px] font-medium text-ink">{isProcessing ? "사진을 줄이는 중" : placeholder}</span>
					<span className="text-[13px]">최대 {maxImages}장, 올릴 때 자동으로 줄여요</span>
				</button>
			)}

			<Input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleFileSelect} className="hidden" />
		</div>
	)
}
