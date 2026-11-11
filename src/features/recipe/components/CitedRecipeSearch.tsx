'use client'

import { useState, useCallback, useEffect, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

import { X, ChefHat, Search, Plus } from "lucide-react";
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client';
import { searchCitableRecipes, CITABLE_PAGE_SIZE } from '@/features/recipe/data/recipe-repository';
import type { Item } from '@/types/item';
import { format } from 'date-fns'; // 날짜 포맷팅을 위해 date-fns 임포트
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
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
  const [hasMore, setHasMore] = useState(false);
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

  const cleanSearchTerm = searchTerm
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const handleSearch = useCallback(async (query: string) => {
    cancelSearch();
    setHasMore(false);

    if (query.length < 2) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    const version = requestVersion.current;
    const controller = new AbortController();
    activeController.current = controller;
    setIsLoading(true);
    try {
      const results = await searchCitableRecipes(supabase, query, controller.signal);
      if (requestVersion.current === version) {
        setSearchResults(results.slice(0, CITABLE_PAGE_SIZE));
        setHasMore(results.length > CITABLE_PAGE_SIZE);
      }
    } catch (error) {
      if (requestVersion.current === version && !controller.signal.aborted) {
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

  useEffect(() => {
    if (!showSearch) return;
    const timer = setTimeout(() => void handleSearch(cleanSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [showSearch, cleanSearchTerm, handleSearch]);

  const handleLoadMore = async () => {
    if (!hasMore || isLoading) return;
    const version = requestVersion.current;
    const controller = new AbortController();
    activeController.current = controller;
    setIsLoading(true);
    try {
      const results = await searchCitableRecipes(supabase, cleanSearchTerm, controller.signal, searchResults.length);
      if (requestVersion.current === version) {
        setSearchResults(current => [...current, ...results.slice(0, CITABLE_PAGE_SIZE)]);
        setHasMore(results.length > CITABLE_PAGE_SIZE);
      }
    } catch (error) {
      if (requestVersion.current === version && !controller.signal.aborted) {
        console.error('Error loading more cited recipes:', error);
      }
    } finally {
      if (requestVersion.current === version) {
        activeController.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleSelectRecipe = (recipe: Item) => {
    if (selectedRecipes.length < maxSelection && !selectedRecipes.some(r => r.item_id === recipe.item_id)) {
      onSelectedRecipesChange([...selectedRecipes, recipe]);
    }
    cancelSearch();
    setSearchTerm('');
    setSearchResults([]);
    setHasMore(false);
    setIsLoading(false);
    setShowSearch(false);
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
      {selectedRecipes.length > 0 && <ul className="divide-y divide-border">{selectedRecipes.map(recipe => (
        <li key={recipe.item_id} className="flex items-center gap-3 py-3">
          <div className="relative aspect-[3/2] w-[72px] shrink-0 overflow-hidden rounded-lg bg-muted">{recipe.image_urls?.[0] ? <Photo src={recipe.image_urls[0]} sizes="72px" /> : <ChefHat className="m-auto h-5 w-5" aria-hidden />}</div>
          <div className="min-w-0 flex-1"><p className="text-label font-medium text-ink [overflow-wrap:anywhere]">{recipe.title}</p><p className="text-caption text-ink-soft">{recipe.username || "익명"}의 레시피</p></div>
          <button type="button" onClick={() => handleRemoveRecipe(recipe.item_id)} aria-label={`${recipe.title} 참고에서 빼기`} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-ink-soft"><X className="h-5 w-5" aria-hidden /></button>
        </li>
      ))}</ul>}

      <Drawer open={showSearch} onOpenChange={(open) => { setShowSearch(open); if (!open) { cancelSearch(); setIsLoading(false) } }} shouldScaleBackground={false}>
        <DrawerTrigger asChild><Button type="button" variant="outline" className="w-full" disabled={selectedRecipes.length >= maxSelection}><Search className="h-5 w-5" aria-hidden />참고 레시피 찾기</Button></DrawerTrigger>
        <DrawerContent className="mx-auto max-h-[85dvh] max-w-md px-4 pb-6 pt-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-title text-ink">참고 레시피 찾기</DrawerTitle>
            <Button type="button" variant="ghost" size="icon" aria-label="닫기" onClick={() => setShowSearch(false)}><X className="h-5 w-5" aria-hidden /></Button>
          </div>
          <DrawerDescription className="sr-only">레시피를 검색하고 참고한 글을 선택하세요.</DrawerDescription>
          <Command shouldFilter={false} className="rounded-lg border border-ink/20">
            <CommandInput ref={inputRef} id="recipe-search-input" aria-label="요리 이름이나 재료 검색" placeholder="요리 이름이나 재료" value={searchTerm} onValueChange={(search) => { cancelSearch(); setSearchTerm(search); setSearchResults([]); setHasMore(false); setIsLoading(false) }} />
            <CommandList className="max-h-[55dvh]">
              {isLoading && <CommandEmpty>검색 중…</CommandEmpty>}
              {!isLoading && searchTerm.length > 1 && searchResults.length === 0 && <CommandEmpty>검색 결과가 없어요.</CommandEmpty>}
              {searchResults.length > 0 && <CommandGroup>{searchResults.map(recipe => (
                <CommandItem key={recipe.item_id} onSelect={() => handleSelectRecipe(recipe)} className="min-h-20 cursor-pointer border-b border-border px-0 py-3 last:border-b-0">
                  <div className="flex w-full items-center gap-3" data-source-result>
                    <div className="relative aspect-[3/2] w-[72px] shrink-0 overflow-hidden rounded-lg bg-muted">{recipe.image_urls?.[0] ? <Photo src={recipe.image_urls[0]} sizes="72px" /> : <ChefHat className="m-auto h-5 w-5" aria-hidden />}</div>
                    <div className="min-w-0 flex-1"><p className="text-label font-medium [overflow-wrap:anywhere]">{recipe.title}</p><p className="text-caption text-ink-soft">{recipe.username || "익명"}{recipe.created_at && ` · ${format(new Date(recipe.created_at), 'MM.dd')}`}</p></div>
                    <span className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden><Plus className="h-5 w-5" /></span>
                  </div>
                </CommandItem>
              ))}</CommandGroup>}
              {hasMore && <div className="px-3 py-2"><Button type="button" variant="outline" className="w-full" disabled={isLoading} onClick={() => void handleLoadMore()}>{isLoading ? "불러오는 중…" : "레시피 더 보기"}</Button></div>}
            </CommandList>
          </Command>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
