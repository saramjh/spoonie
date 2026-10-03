'use client'

import { useState, useCallback, useEffect, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

import { X, ChefHat, Search } from "lucide-react";
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client';
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

  const handleSearch = useCallback(async (query: string) => {

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);

    // 검색어 정리: 특수문자 제거 및 정규화
    const cleanQuery = query
      .replace(/[,;|\[\]{}()"']/g, ' ') // 특수문자를 공백으로 변경
      .replace(/\s+/g, ' ') // 연속된 공백을 하나로 정리
      .trim(); // 앞뒤 공백 제거



    if (cleanQuery.length < 2) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    // 1. profiles 테이블에서 검색어에 해당하는 user_id 가져오기
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
              .ilike('username', `%${cleanQuery}%`)
      .limit(10);

    

    if (profileError) {
      console.error('Error searching profiles:', profileError);
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const matchingUserIds = profileData.map(p => p.id);
    

    // 2. items 테이블에서 레시피명 또는 user_id로 검색
    let itemQuery = `title.ilike.%${cleanQuery}%`;
    if (matchingUserIds.length > 0) {
      itemQuery += `,user_id.in.(${matchingUserIds.join(',')})`;
    }

    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select(
        `
        id, title, created_at, item_type, image_urls, user_id, cited_recipe_ids,
        author:profiles!items_user_id_fkey(username, public_id, avatar_url)
        `
      )
      .eq('item_type', 'recipe')
      .or(itemQuery)
      .limit(10);

    

    if (itemError) {
      console.error('Error searching items:', itemError);
      setSearchResults([]);
    } else {
      // Item 타입에 맞게 데이터 변환
      // Supabase 관계 조회는 한 건이어도 배열로 올 수 있다
      const authorOf = (row: { author?: unknown }) => (Array.isArray(row.author) ? row.author[0] : row.author) as { username?: string; avatar_url?: string | null; public_id?: string | null } | undefined
      const formattedData: Item[] = itemData.map(item => ({
        id: item.id,
        item_id: item.id,
        user_id: item.user_id,
        item_type: item.item_type,
        created_at: item.created_at,
        is_public: true, // 검색 결과에서는 is_public이 항상 true라고 가정
        username: authorOf(item)?.username || "익명",
        avatar_url: authorOf(item)?.avatar_url || null,
        user_public_id: authorOf(item)?.public_id || null,
        user_email: null, // 이메일은 가져오지 않음
        title: item.title,
        content: null, // 게시물이 아니므로 null
        description: null, // 게시물이 아니므로 null
        image_urls: item.image_urls,
        thumbnail_index: 0, // 기본값
        tags: [], // 검색 결과에서는 태그를 가져오지 않음
        color_label: null, // 레시피가 아니므로 null
        servings: null, // 레시피가 아니므로 null
        cooking_time_minutes: null, // 레시피가 아니므로 null
        recipe_id: null, // 레시피가 아니므로 null
        likes_count: 0, // 검색 결과에서는 좋아요 수 가져오지 않음
        comments_count: 0, // 검색 결과에서는 댓글 수 가져오지 않음
        is_liked: false, // 검색 결과에서는 좋아요 여부 가져오지 않음
        is_following: false, // 검색 결과에서는 팔로우 여부 가져오지 않음
        cited_recipe_ids: item.cited_recipe_ids || [],
      }));
  
      setSearchResults(formattedData);
    }
    setIsLoading(false);
  }, [supabase]);

  const handleSelectRecipe = (recipe: Item) => {
    if (selectedRecipes.length < maxSelection && !selectedRecipes.some(r => r.item_id === recipe.item_id)) {
      onSelectedRecipesChange([...selectedRecipes, recipe]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveRecipe = (recipeId: string) => {
    onSelectedRecipesChange(selectedRecipes.filter(r => r.item_id !== recipeId));
  };

  // 검색창 표시될 때 자동 포커스
  useEffect(() => {
    if (showSearch && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // 렌더링 완료 후 포커스
    }
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

      {/* 선택된 레시피들 - 토스 스타일 카드 */}
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
