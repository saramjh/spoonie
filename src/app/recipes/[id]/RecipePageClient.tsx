"use client"

/**
 * 🚀 클라이언트 사이드 레시피 페이지
 * 서버사이드 인증 문제 해결을 위해 클라이언트에서 데이터 로딩
 */

import { useEffect, useState } from "react"
import { notFound } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import ItemDetailView from "@/components/common/ItemDetailView"
import { ItemDetail } from "@/types/item"

interface RecipePageClientProps {
  recipeId: string
}

export default function RecipePageClient({ recipeId }: RecipePageClientProps) {
  const [recipe, setRecipe] = useState<ItemDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRecipe = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // 🔐 현재 사용자 확인
        const { data: { user } } = await supabase.auth.getUser()
        

        
        // 🚀 클라이언트에서 데이터 조회 (브라우저 세션 인증 사용)
        const { data: recipeData, error: recipeError } = await supabase
          .from('items')
          .select(`
            *,
            profiles!items_user_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              public_id
            ),
            ingredients (
              id,
              name,
              amount,
              unit
            ),
            instructions (
              id,
              step_number,
              description,
              image_url
            )
          `)
          .eq('id', recipeId)
          .eq('item_type', 'recipe')
          .single()
        


        if (recipeError) {
          console.error('❌ Recipe query error:', recipeError)
          setError(recipeError.message)
          return
        }

        if (!recipeData) {
          console.error('❌ Recipe not found')
          setError('Recipe not found')
          return
        }

        // 🔄 데이터 변환: DB 스키마를 컴포넌트 인터페이스에 맞게 변환
        const transformedRecipe = {
          ...recipeData,
          // ingredients는 이미 올바른 형태
          ingredients: recipeData.ingredients || [],
          // instructions를 steps로 변환하고 step_number로 정렬
          steps: recipeData.instructions
            ? recipeData.instructions
                .sort((a, b) => a.step_number - b.step_number)
                .map(instruction => ({
                  step_number: instruction.step_number,
                  description: instruction.description,
                  image_url: instruction.image_url
                }))
            : []
        }

        setRecipe(transformedRecipe as ItemDetail)
      } catch (err) {
        console.error('❌ Recipe loading error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipe()
  }, [recipeId])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error) {
    console.error('🚨 Recipe page error:', error)
    notFound()
  }

  if (!recipe) {
    notFound()
  }

  return <ItemDetailView item={recipe} />
}