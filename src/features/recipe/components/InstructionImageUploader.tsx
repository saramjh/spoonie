"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { X, Camera } from "lucide-react"
import { optimizeImages, isValidImageType, isValidFileSize, OptimizedImage } from "@/shared/infra/image-utils"
import { useToast } from "@/hooks/use-toast"

interface InstructionImageUploaderProps {
  imageUrl: string | undefined;
  onImageChange: (image: OptimizedImage | null) => void;
  placeholder?: string;
}

export default function InstructionImageUploader({ imageUrl, onImageChange, placeholder = "단계 사진 추가 (선택)" }: InstructionImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [preview, setPreview] = useState<string | undefined>(imageUrl);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!isValidImageType(file) || !isValidFileSize(file)) {
        toast({
          title: "파일 형식 오류",
          description: "JPG, PNG, WEBP 형식의 10MB 이하 이미지만 업로드 가능합니다.",
          variant: "destructive",
        });
        return;
      }


      try {
        const [optimizedImage] = await optimizeImages([file]);
        setPreview(optimizedImage.preview);
        onImageChange(optimizedImage);
        toast({ title: "이미지 업로드 완료" });
      } catch (error) {
        console.error("Image optimization failed:", error);
        toast({
          title: "이미지 처리 실패",
          description: "이미지 처리 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onImageChange, toast]
  );

  const removeImage = useCallback(() => {
    setPreview(undefined);
    onImageChange(null);
  }, [onImageChange]);

  // 단계 사진은 선택이다: 비어 있으면 작은 추가 버튼만, 있으면 4:3 프레임 (DESIGN.md Interface Grammar 4)
  return (
    <div className="w-full">
      {preview ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-muted">
          <Image src={preview} alt="단계 사진 미리보기" fill sizes="(max-width: 448px) 80vw, 360px" className="object-contain" />
          <button
            type="button"
            onClick={removeImage}
            aria-label="단계 사진 지우기"
            className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-paper">
              <X className="h-4 w-4" aria-hidden />
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-dashed border-ink/30 px-3 text-meta text-ink-soft"
        >
          <Camera className="h-4 w-4" aria-hidden />
          {placeholder}
        </button>
      )}
      <Input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}
