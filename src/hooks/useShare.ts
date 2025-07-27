'use client';

import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

interface ShareData {
  title: string;
  text: string;
  url: string;
}

export const useShare = () => {
  const { toast } = useToast();

  const share = useCallback(async (shareData: ShareData) => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error("Error sharing:", error);
            toast({
                title: "공유 실패",
                description: "게시물을 공유하는 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "링크 복사됨",
          description: "클립보드에 링크가 복사되었습니다.",
        });
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast({
          title: "복사 실패",
          description: "링크를 클립보드에 복사하는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  return { share };
};
