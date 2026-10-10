'use client'

import { useState, useCallback, useEffect, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

import { X, ChefHat, Search } from "lucide-react";
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client';
import { searchCitableRecipes } from '@/features/recipe/data/recipe-repository';
import type { Item } from '@/types/item';
import { format } from 'date-fns'; // 날짜 포맷팅을 위해 date-fns 임포트
import { Photo } from "@/components/kit"

interface CitedRecipeSearchProps {
  selectedRecipes: Item[];
  onSelectedRecipesChange: (recipes: Item[]) => void;
  maxSelection?: number;
}

export default function CitedRecipeSearch({ selectedRecipes, onSelectedRecipesChange, maxSelection = 5 }: CitedRecipeSearchProps) {
  const supabase = createSupabaseBrowserClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false); // 검색 표시 상태 추가
  const inputRef = useRef<HTMLInputElement>(null); // input 참조
  const requestVersion = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    requestVersion.current++;
    activeController.current?.abort();
    activeController.current = null;
  }, []);

  useEffect(() => () => {
    requestVersion.current++;
    activeController.current?.abort();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    cancelSearch();

    // PostgREST or() 필터의 구분 문자를 제거해 입력을 검색어로만 다룬다.
    const cleanQuery = query
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanQuery.length < 2) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const version = requestVersion.current;
    const controller = new AbortController();
    activeController.current = controller;
    setIsLoading(true);
    try {
      const results = await searchCitableRecipes(supabase, cleanQuery, controller.signal);
      if (requestVersion.current === version) setSearchResults(results);
    } catch (error) {
      if (requestVersion.current === version) {
        console.error('Error searching cited recipes:', error);
        setSearchResults([]);
      }
    } finally {
      if (requestVersion.current === version) {
        activeController.current = null;
        setIsLoading(false);
      }
    }
  }, [supabase, cancelSearch]);

  const handleSelectRecipe = (recipe: Item) => {
    if (selectedRecipes.length < maxSelection && !selectedRecipes.some(r => r.item_id === recipe.item_id)) {
      onSelectedRecipesChange([...selectedRecipes, recipe]);
    }
    cancelSearch();
    setSearchTerm('');
    setSearchResults([]);
    setIsLoading(false);
  };

  const handleRemoveRecipe = (recipeId: string) => {
    onSelectedRecipesChange(selectedRecipes.filter(r => r.item_id !== recipeId));
  };

  // 검색창 표시될 때 자동 포커스
  useEffect(() => {
    if (!showSearch) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [showSearch]);

  return (
    <div className="space-y-3">
      {/* 시작 상태: 작은 찾기 버튼 하나 */}
      {selectedRecipes.length === 0 && !searchTerm && !showSearch && (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="flex h-11 w-full items-center gap-2 rounded-md border border-dashed border-ink/30 px-3 text-left text-label text-ink-soft"
        >
          <Search className="h-4 w-4" aria-hidden />
          레시피 찾아서 고르기
        </button>
      )}

      {/* 검색 영역 - 필요할 때만 표시 */}
      {(searchTerm || selectedRecipes.length > 0 || showSearch) && (
        <div className="relative">
          <Command shouldFilter={false} className="rounded-lg border border-ink/20">
            <CommandInput 
              ref={inputRef}
              id="recipe-search-input"
              placeholder="어떤 레시피를 참고하셨나요?" 
              value={searchTerm}
              onValueChange={(search) => {
                setSearchTerm(search);
                handleSearch(search);
              }}
              className="border-none"
            />
            <CommandList className="max-h-48">
              {isLoading && <CommandEmpty>검색 중...</CommandEmpty>}
              {!isLoading && searchTerm.length > 1 && searchResults.length === 0 && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>}
              {searchResults.length > 0 && (
                <CommandGroup>
                  {searchResults.map((recipe) => (
                    <CommandItem key={recipe.item_id} onSelect={() => handleSelectRecipe(recipe)} className="cursor-pointer hover:bg-muted">
                      <div className="flex items-center gap-3 w-full">
                        {/* 썸네일 추가 */}
                        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-[2px] bg-muted">
                          {recipe.image_urls && recipe.image_urls.length > 0 ? (
                            <Photo src={recipe.image_urls[0]} sizes="36px" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ChefHat className="h-4 w-4 text-ink-soft" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-label font-medium truncate">{recipe.title}</div>
                          <div className="text-meta text-ink-soft truncate">
                            {recipe.username || "익명"} • {recipe.created_at && format(new Date(recipe.created_at), 'MM.dd')}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}

      {selectedRecipes.length > 0 && (
        <div className="space-y-2">
          <ul className="divide-y divide-border">
            {selectedRecipes.map(recipe => (
              <li key={recipe.item_id} className="flex items-center gap-3 py-2">
                {/* 썸네일 */}
                <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-[2px] bg-muted">
                  {recipe.image_urls && recipe.image_urls.length > 0 ? (
                    <Photo src={recipe.image_urls[0]} sizes="44px" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ChefHat className="h-4 w-4 text-ink-soft" aria-hidden="true" />
                    </div>
                  )}
                </div>
                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink truncate">{recipe.title}</div>
                  <div className="text-meta text-ink-soft truncate">{recipe.username || "익명"}의 레시피</div>
                </div>
                {/* 삭제 버튼 */}
                <button 
                  type="button"
                  onClick={() => handleRemoveRecipe(recipe.item_id)} 
                  aria-label={`${recipe.title} 참고에서 빼기`}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-ink-soft"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
