'use client'

import { useState, useCallback, useEffect, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import type { Item } from '@/types/item';
import { format } from 'date-fns'; // 날짜 포맷팅을 위해 date-fns 임포트

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
  const [showSearch, setShowSearch] = useState(false); // 🚀 검색 표시 상태 추가
  const inputRef = useRef<HTMLInputElement>(null); // 🎯 input 참조

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
      .or(`display_name.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%`)
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
        author:profiles!items_user_id_fkey(display_name, username, public_id, avatar_url)
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
      const formattedData: Item[] = itemData.map(item => ({
        id: item.id,
        item_id: item.id,
        user_id: item.user_id,
        item_type: item.item_type,
        created_at: item.created_at,
        is_public: true, // 검색 결과에서는 is_public이 항상 true라고 가정
        display_name: item.author?.[0]?.display_name || item.author?.[0]?.username || "익명",
        avatar_url: item.author?.[0]?.avatar_url || null,
        user_public_id: item.author?.[0]?.public_id || null,
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

  // 🎯 검색창 표시될 때 자동 포커스
  useEffect(() => {
    if (showSearch && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // 렌더링 완료 후 포커스
    }
  }, [showSearch]);

  return (
    <div className="space-y-4">
      {/* 🚀 토스 스타일: 미니멀한 시작 상태 */}
      {selectedRecipes.length === 0 && !searchTerm && !showSearch && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-300 hover:bg-orange-50/30 transition-all duration-200 cursor-pointer group"
             onClick={() => setShowSearch(true)}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <span className="text-lg">🍳</span>
            </div>
            <p className="text-sm text-gray-600 group-hover:text-orange-600 transition-colors">
              참고한 레시피가 있다면 추가해보세요
            </p>
            <p className="text-xs text-gray-400">레시피를 검색하고 선택할 수 있어요</p>
          </div>
        </div>
      )}

      {/* 🎯 검색 영역 - 필요할 때만 표시 */}
      {(searchTerm || selectedRecipes.length > 0 || showSearch) && (
        <div className="relative">
          <Command shouldFilter={false} className="border border-gray-200 rounded-xl shadow-sm">
            <CommandInput 
              ref={inputRef}
              id="recipe-search-input"
              placeholder="어떤 레시피를 참고하셨나요?" 
              value={searchTerm}
              onValueChange={(search) => {
                setSearchTerm(search);
                handleSearch(search);
              }}
              className="border-none bg-gray-50/50"
            />
            <CommandList className="max-h-48">
              {isLoading && <CommandEmpty>검색 중...</CommandEmpty>}
              {!isLoading && searchTerm.length > 1 && searchResults.length === 0 && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>}
              {searchResults.length > 0 && (
                <CommandGroup>
                  {searchResults.map((recipe) => (
                    <CommandItem key={recipe.item_id} onSelect={() => handleSelectRecipe(recipe)} className="cursor-pointer hover:bg-orange-50">
                      <div className="flex items-center gap-3 w-full">
                        {/* 🖼️ 썸네일 추가 */}
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex-shrink-0 overflow-hidden">
                          {recipe.image_urls && recipe.image_urls.length > 0 ? (
                            <img src={recipe.image_urls[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                              <span className="text-xs">🍳</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{recipe.title}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {recipe.display_name || "익명"} • {recipe.created_at && format(new Date(recipe.created_at), 'MM.dd')}
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

      {/* 🏷️ 선택된 레시피들 - 토스 스타일 카드 */}
      {selectedRecipes.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <span>📚</span>
            <span>참고 레시피 {selectedRecipes.length}개</span>
          </div>
          <div className="grid gap-2">
            {selectedRecipes.map(recipe => (
              <div key={recipe.item_id} className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3 group hover:bg-orange-100 transition-colors">
                {/* 썸네일 */}
                <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex-shrink-0">
                  {recipe.image_urls && recipe.image_urls.length > 0 ? (
                    <img src={recipe.image_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center">
                      <span className="text-sm">🍳</span>
                    </div>
                  )}
                </div>
                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{recipe.title}</div>
                  <div className="text-sm text-gray-600 truncate">{recipe.display_name || "익명"}의 레시피</div>
                </div>
                {/* 삭제 버튼 */}
                <button 
                  onClick={() => handleRemoveRecipe(recipe.item_id)} 
                  className="w-6 h-6 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
