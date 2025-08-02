"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { X, Camera } from "lucide-react"
import { optimizeImages, isValidImageType, isValidFileSize, OptimizedImage } from "@/lib/image-utils"
import { useToast } from "@/hooks/use-toast"

interface InstructionImageUploaderProps {
  imageUrl: string | undefined;
  onImageChange: (image: OptimizedImage | null) => void;
  placeholder?: string;
}

export default function InstructionImageUploader({ imageUrl, onImageChange, placeholder = "이미지 추가" }: InstructionImageUploaderProps) {
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

  return (
    <div className="w-full">
      {preview ? (
        <Card className="relative group overflow-hidden aspect-video">
          <button onClick={removeImage} className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-3 h-3" />
          </button>
                      <Image src={preview} alt="Instruction preview" fill className="object-cover" priority />
        </Card>
      ) : (
        <Card 
          className="aspect-video border-2 border-dashed border-gray-300 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all duration-300"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="h-full flex flex-col items-center justify-center text-gray-400 hover:text-orange-500 space-y-2 transition-colors duration-300">
            <Camera className="w-8 h-8" />
            <p className="text-sm font-medium">{placeholder}</p>
          </div>
        </Card>
      )}
      <Input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}
