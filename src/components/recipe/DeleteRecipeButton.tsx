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
import { useSWRConfig } from 'swr'
import { cacheManager } from "@/lib/unified-cache-manager"

interface DeleteRecipeButtonProps {
  recipeId: string;
}

export default function DeleteRecipeButton({ recipeId }: DeleteRecipeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    console.log(`🚀 DeleteRecipeButton: Starting SSA-based deletion of recipe ${recipeId}`)

    try {
      console.log(`🚀 DeleteRecipeButton: SSA optimistic deletion...`);
      
      // 🚀 SSA 기반: 즉시 옵티미스틱 업데이트로 모든 캐시에서 제거
      const rollback = await cacheManager.deleteItem(recipeId);
      
      try {
        // 🚀 SSA 기반: 백그라운드 DB 삭제
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', recipeId)
          .eq('user_id', user.id); // 보안: 자신의 아이템만 삭제
          
        if (error) throw error;
        
        console.log(`✅ DeleteRecipeButton: Recipe deleted successfully via SSA`);
        
        toast({
          title: "레시피가 삭제되었습니다.",
        })
        
        router.push('/')
      } catch (dbError) {
        // DB 삭제 실패 시 캐시 롤백
        console.error(`❌ DeleteRecipeButton: DB deletion failed, rolling back:`, dbError);
        rollback();
        throw dbError;
      }
      
    } catch (error: any) {
      console.error("❌ DeleteRecipeButton: SSA delete failed:", error)
      
      toast({
        title: "삭제에 실패했습니다.",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
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
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "삭제 중..." : "삭제"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
