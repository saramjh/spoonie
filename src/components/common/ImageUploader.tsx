"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ImagePlus, X, Star, Camera } from "lucide-react"
import { optimizeImages, formatFileSize, isValidImageType, isValidFileSize, OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"

interface ImageUploaderProps {
	images: OptimizedImage[]
	onImagesChange: (images: OptimizedImage[]) => void
	maxImages?: number
	label?: string
	placeholder?: string
	thumbnailIndex?: number
	onThumbnailChange?: (index: number) => void
	showThumbnailSelector?: boolean

}

export default function ImageUploader({ images, onImagesChange, maxImages = 5, label = "이미지 업로드", placeholder = "이미지를 추가해주세요", thumbnailIndex = 0, onThumbnailChange, showThumbnailSelector = true }: ImageUploaderProps) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const { toast } = useToast()
	const [isProcessing, setIsProcessing] = useState(false)
	
	// 🚀 SSA: 썸네일 인덱스 동기화를 위한 내부 상태
	const [currentThumbnailIndex, setCurrentThumbnailIndex] = useState(thumbnailIndex)
	
	// 🚀 SSA: thumbnailIndex prop 변경 감지 및 동기화
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
				onImagesChange([...images, ...optimizedImages])

				toast({
					title: "이미지 업로드 완료",
					description: `${files.length}개의 이미지가 업로드되었습니다.`,
				})
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
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Label className="text-base font-medium">{label}</Label>
				<span className="text-sm text-ink-soft">
					{images.length}/{maxImages}
				</span>
			</div>

			{images.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
					{images.map((image, index) => (
						<Card key={`${image.file.name}-${index}`} className={`relative group overflow-hidden aspect-square transition-all duration-200 ${
							showThumbnailSelector && index === currentThumbnailIndex 
								? 'ring-4 ring-blue-500 ring-offset-2 shadow-lg scale-105' 
								: 'hover:shadow-md'
						}`}>
							{showThumbnailSelector && index === currentThumbnailIndex && (
								<div className="absolute top-2 left-2 z-20 bg-blue-500 text-white rounded-full p-1.5 flex items-center justify-center shadow-lg">
									<Star className="w-4 h-4 fill-current" />
								</div>
							)}
							{showThumbnailSelector && index === currentThumbnailIndex && (
								<div className="absolute inset-0 bg-blue-500 bg-opacity-20 z-10 flex items-center justify-center">
									<div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
										현재 썸네일
									</div>
								</div>
							)}

							<button type="button" onClick={() => removeImage(index)} className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<X className="w-3 h-3" />
							</button>

							{showThumbnailSelector && index !== currentThumbnailIndex && (
								<button type="button" onClick={() => setThumbnail(index)} className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="썸네일로 설정">
									<Star className="w-3 h-3" />
								</button>
							)}

							<Image 
							src={image.preview} 
							alt={`Preview ${index + 1}`} 
							fill 
							className="object-cover cursor-pointer" 
							onClick={() => showThumbnailSelector && setThumbnail(index)}
							priority={index === 0}
						/>

							<div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<div>{image.width} × {image.height}</div>
								<div>
									{image.file.size > 0 
										? formatFileSize(image.file.size) 
										: "기존 이미지"
									}
								</div>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card className="aspect-video border-2 border-dashed border-border cursor-pointer hover:border-orange-ink hover:bg-muted transition-all duration-300" onClick={() => fileInputRef.current?.click()}>
					<div className="h-full flex flex-col items-center justify-center text-ink-soft hover:text-orange-ink space-y-2 transition-colors duration-300">
						<Camera className="w-12 h-12" />
						<p className="text-sm font-medium">{placeholder}</p>
						<p className="text-xs">최대 {maxImages}개, 10MB 이하</p>
					</div>
				</Card>
			)}

			<div className="flex gap-2 mt-4">
				{images.length > 0 && images.length < maxImages && (
					<Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="flex-1">
						<ImagePlus className="w-4 h-4 mr-2" />
						{isProcessing ? "처리 중..." : "이미지 추가"}
					</Button>
				)}
			</div>

			<Input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleFileSelect} className="hidden" />

			{images.length === 0 && (
				<div className="mt-2">
					<p className="text-xs text-ink-soft">JPG, PNG, WEBP 형식의 이미지를 업로드하세요. 자동으로 최적화됩니다.</p>
				</div>
			)}

		</div>
	)
}