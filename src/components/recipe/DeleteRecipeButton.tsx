'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useToast } from "@/hooks/use-toast"

interface DeleteRecipeButtonProps {
  recipeId: string;
}

export default function DeleteRecipeButton({ recipeId }: DeleteRecipeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    // 1. 레시피 데이터 조회 (이미지 URL 포함)
    const { data: recipeData, error: fetchError } = await supabase
      .from('recipes')
      .select('image_urls, instructions')
      .eq('id', recipeId)
      .single();

    if (fetchError || !recipeData) {
      toast({ title: '레시피 정보 불러오기 실패', description: fetchError?.message || '레시피를 찾을 수 없습니다.', variant: 'destructive' });
      return;
    }

    const filesToDelete: string[] = [];

    // 레시피 대표 이미지 URL 추출
    if (recipeData.image_urls && recipeData.image_urls.length > 0) {
      recipeData.image_urls.forEach((url: string) => {
        const path = url.split('/process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS!/')[1];
        if (path) filesToDelete.push(`process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS!/${path}`);
      });
    }

    // 조리법 단계별 이미지 URL 추출
    if (recipeData.instructions && Array.isArray(recipeData.instructions)) {
      recipeData.instructions.forEach((instruction: any) => {
        if (instruction.image_url) {
          const path = instruction.image_url.split('/process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS!/')[1];
          if (path) filesToDelete.push(`process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS!/${path}`);
        }
      });
    }

    // 2. Supabase Storage에서 이미지 삭제
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage.from('process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS!').remove(filesToDelete);
      if (storageError) {
        toast({ title: '이미지 삭제 실패', description: storageError.message, variant: 'destructive' });
        // 이미지 삭제 실패해도 레시피 데이터는 삭제 진행 (데이터 일관성 유지)
      }
    }

    // 3. 레시피 데이터 삭제
    const { error: deleteError } = await supabase.from('recipes').delete().eq('id', recipeId);

    if (deleteError) {
      toast({ title: '레시피 삭제 실패', description: deleteError.message, variant: 'destructive' });
    } else {
      toast({ title: '성공', description: '레시피가 성공적으로 삭제되었습니다.' });
      router.push('/recipes');
      router.refresh();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">삭제</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 레시피와 관련된 모든 데이터가 영구적으로 삭제됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
