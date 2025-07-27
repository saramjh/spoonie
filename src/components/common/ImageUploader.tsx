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
					description: "JPG, PNG, WEBP 형식의 5MB 이하 이미지만 업로드 가능합니다.",
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

			if (onThumbnailChange && thumbnailIndex >= newImages.length && newImages.length > 0) {
				onThumbnailChange(0)
			}
		},
		[images, onImagesChange, thumbnailIndex, onThumbnailChange]
	)

	const setThumbnail = useCallback(
		(index: number) => {
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
				<span className="text-sm text-gray-500">
					{images.length}/{maxImages}
				</span>
			</div>

			{images.length > 0 ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
					{images.map((image, index) => (
						<Card key={image.id || index} className="relative group overflow-hidden aspect-square">
							{showThumbnailSelector && index === thumbnailIndex && (
								<div className="absolute top-2 left-2 z-10 bg-orange-500 text-white rounded-full p-1 flex items-center justify-center">
									<Star className="w-3 h-3 fill-current" />
								</div>
							)}

							<button onClick={() => removeImage(index)} className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<X className="w-3 h-3" />
							</button>

							{showThumbnailSelector && index !== thumbnailIndex && (
								<button onClick={() => setThumbnail(index)} className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="썸네일로 설정">
									<Star className="w-3 h-3" />
								</button>
							)}

							<Image src={image.preview} alt={`Preview ${index + 1}`} fill className="object-cover cursor-pointer" onClick={() => showThumbnailSelector && setThumbnail(index)} />

							<div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<div>{image.width} × {image.height}</div>
								<div>{formatFileSize(image.file.size)}</div>
							</div>
						</Card>
					))}
				</div>
			) : (
				<Card className="aspect-video border-2 border-dashed border-gray-300 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all duration-300" onClick={() => fileInputRef.current?.click()}>
					<div className="h-full flex flex-col items-center justify-center text-gray-400 hover:text-orange-500 space-y-2 transition-colors duration-300">
						<Camera className="w-12 h-12" />
						<p className="text-sm font-medium">{placeholder}</p>
						<p className="text-xs">최대 {maxImages}개, 5MB 이하</p>
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
					<p className="text-xs text-gray-500">JPG, PNG, WEBP 형식의 이미지를 업로드하세요. 자동으로 최적화됩니다.</p>
				</div>
			)}
		</div>
	)
}