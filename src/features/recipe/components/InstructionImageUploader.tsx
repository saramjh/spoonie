"use client"

import { useState, useRef, useCallback, useId } from "react"
import Image from "next/image"

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
  const fileInputId = useId();
  const { toast } = useToast();

  const [selectedPreview, setSelectedPreview] = useState<string | null | undefined>(undefined);
  const preview = selectedPreview === undefined ? imageUrl : selectedPreview || undefined;

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      if (!isValidImageType(file) || !isValidFileSize(file)) {
        toast({
          title: "파일 형식 오류",
          description: "JPG, PNG, WEBP 또는 기기에서 열 수 있는 HEIC 사진(10MB 이하)을 선택해 주세요.",
          variant: "destructive",
        });
        return;
      }


      try {
        const [optimizedImage] = await optimizeImages([file]);
        setSelectedPreview(optimizedImage.preview);
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
    setSelectedPreview(null);
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
        <label
          htmlFor={fileInputId}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink/30 px-3 text-meta text-ink-soft"
        >
          <Camera className="h-4 w-4" aria-hidden />
          {placeholder}
        </label>
      )}
      <input id={fileInputId} ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="sr-only" tabIndex={-1} />
    </div>
  );
}
