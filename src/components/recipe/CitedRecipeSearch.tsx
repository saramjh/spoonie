'use client'

import { useState, useCallback } from 'react';
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

  const handleSearch = useCallback(async (query: string) => {
    console.log("handleSearch: query", query); // 검색어 로그
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

    console.log("handleSearch: cleanQuery", cleanQuery); // 정리된 검색어 로그

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

    console.log("handleSearch: profileData", profileData); // profileData 로그
    console.log("handleSearch: profileError", profileError); // profileError 로그

    if (profileError) {
      console.error('Error searching profiles:', profileError);
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const matchingUserIds = profileData.map(p => p.id);
    console.log("handleSearch: matchingUserIds", matchingUserIds); // matchingUserIds 로그

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

    console.log("handleSearch: itemData", itemData); // itemData 로그
    console.log("handleSearch: itemError", itemError); // itemError 로그

    if (itemError) {
      console.error('Error searching items:', itemError);
      setSearchResults([]);
    } else {
      // Item 타입에 맞게 데이터 변환
      const formattedData: Item[] = itemData.map(item => ({
        item_id: item.id,
        user_id: item.user_id,
        item_type: item.item_type,
        created_at: item.created_at,
        is_public: true, // 검색 결과에서는 is_public이 항상 true라고 가정
        display_name: item.author?.display_name || item.author?.username || "익명",
        avatar_url: item.author?.avatar_url || null,
        user_public_id: item.author?.public_id || null,
        user_email: null, // 이메일은 가져오지 않음
        title: item.title,
        content: null, // 게시물이 아니므로 null
        description: null, // 게시물이 아니므로 null
        image_urls: item.image_urls,
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
      console.log("handleSearch: formattedData", formattedData); // formattedData 로그
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

  return (
    <div className="space-y-4">
      <Command shouldFilter={false}> {/* shouldFilter={false} 추가 */}
        <CommandInput 
          placeholder="레시피 검색..." 
          value={searchTerm}
          onValueChange={(search) => {
            setSearchTerm(search);
            handleSearch(search);
          }}
        />
        <CommandList>
          {isLoading && <CommandEmpty>검색 중...</CommandEmpty>}
          {!isLoading && searchTerm.length > 1 && searchResults.length === 0 && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>} {/* 조건 수정 */}
          {searchResults.length > 0 && (
            <CommandGroup heading="검색 결과">
              {searchResults.map((recipe) => (
                <CommandItem key={recipe.item_id} onSelect={() => handleSelectRecipe(recipe)}>
                  <div className="flex justify-between items-center w-full">
                    <span>
                      <span className="font-semibold">{recipe.display_name || "익명"}</span>의 {recipe.title}
                    </span>
                    {recipe.created_at && (
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {format(new Date(recipe.created_at), 'yyyy.MM.dd')}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
      <div className="flex flex-wrap gap-2">
        {selectedRecipes.map(recipe => (
          <Badge key={recipe.item_id} variant="secondary" className="flex items-center gap-1">
            <span className="font-semibold">{recipe.display_name || "익명"}</span>의 {recipe.title}
            <button onClick={() => handleRemoveRecipe(recipe.item_id)} className="rounded-full hover:bg-gray-300 p-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
