'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import debounce from 'lodash.debounce'

interface Recipe {
  id: string;
  title: string;
  author_name: string; // Changed from profiles.user_name
}

interface RecipeCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeSelect: (recipe: { id: string; title: string }) => void;
}

export default function RecipeCitationModal({ isOpen, onClose, onRecipeSelect }: RecipeCitationModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const searchRecipes = async (query: string) => {
    if (query.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase
      .from('recipes_with_author') // Changed to use the view
      .select('id, title, author_name') // Select author_name directly
      .ilike('title', `%${query}%`)
      .eq('is_public', true)
      .limit(10)

    if (error) {
      console.error('Error searching recipes:', error)
      setResults([])
    } else {
      setResults(data as Recipe[])
    }
    setIsLoading(false)
  }

  const debouncedSearch = useCallback(debounce(searchRecipes, 300), [])

  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, debouncedSearch])

  const handleSelect = (recipe: Recipe) => {
    onRecipeSelect({ id: recipe.id, title: recipe.title })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>레시피 인용하기</DialogTitle>
          <DialogDescription>인용할 레시피의 제목을 검색하세요. 공개된 레시피만 검색됩니다.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="예: 김치찌개" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 space-y-2 h-60 overflow-y-auto">
          {isLoading && <p className="text-center text-gray-500">검색 중...</p>}
          {!isLoading && results.length === 0 && searchQuery.length > 1 && (
            <p className="text-center text-gray-500">검색 결과가 없습니다.</p>
          )}
          {results.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => handleSelect(recipe)}
              className="p-3 border rounded-md hover:bg-gray-100 cursor-pointer"
            >
              <p className="font-semibold">{recipe.title}</p>
              <p className="text-sm text-gray-500">by {recipe.author_name || '알 수 없는 사용자'}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
