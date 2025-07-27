'use client'

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';
import useSWR from 'swr';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useRefresh } from '@/contexts/RefreshContext';
import PopularKeywords from '@/components/search/PopularKeywords';
import PopularPosts from '@/components/search/PopularPosts';
import SearchResults from '@/components/search/SearchResults';
import type { FeedItem } from '@/types/item';
import { getPopularKeywordsCached, getPopularPostsCached, optimizedSearch, SearchMetrics } from '@/utils/search-optimization';

const fetcher = async (key: string): Promise<unknown> => {
  const [type, query] = key.split('|');

  switch (type) {
    case 'popular_keywords':
      // 🚀 최적화된 캐시 기반 인기 키워드 조회
      const startTime = performance.now();
      try {
        const keywords = await getPopularKeywordsCached();
        const endTime = performance.now();
        SearchMetrics.recordSearch(endTime - startTime, keywords.length > 0);
        return keywords;
      } catch (error) {
        SearchMetrics.recordError();
        console.error('❌ Popular keywords fetch failed:', error);
        return [];
      }

    case 'popular_posts':
      // 🚀 최적화된 캐시 기반 인기 게시물 조회
      try {
        const posts = await getPopularPostsCached();
        return posts;
      } catch (error) {
        console.error('❌ Popular posts fetch failed:', error);
        return [];
      }

    case 'search':
      if (!query) return [];
      
      // 🚀 디바운싱된 최적화 검색
      const searchStartTime = performance.now();
      try {
        const results = await optimizedSearch.search(query);
        const searchEndTime = performance.now();
        SearchMetrics.recordSearch(searchEndTime - searchStartTime, false);
        return results;
      } catch (error) {
        SearchMetrics.recordError();
        console.error('❌ Optimized search failed:', error);
        return [];
      }

    default:
      return null;
  }
};

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh();
  const pathname = usePathname();

  const { data: popularKeywords, isLoading: keywordsLoading, mutate: mutateKeywords } = useSWR('popular_keywords', fetcher);
  const { data: popularPosts, isLoading: postsLoading, mutate: mutatePosts } = useSWR('popular_posts', fetcher);
  const { data: searchResults, isLoading: searchLoading, mutate: mutateSearch } = useSWR(debouncedSearchTerm ? `search|${debouncedSearchTerm}` : null, fetcher);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handleRefresh = async () => {
      await Promise.all([
        mutateKeywords(),
        mutatePosts(),
        debouncedSearchTerm ? mutateSearch() : Promise.resolve(),
      ]);
    };
    registerRefreshFunction(pathname, handleRefresh);
    return () => unregisterRefreshFunction(pathname);
  }, [pathname, registerRefreshFunction, unregisterRefreshFunction, mutateKeywords, mutatePosts, mutateSearch, debouncedSearchTerm]);

  const handleKeywordClick = (keyword: string) => {
    setSearchTerm(keyword);
  };

  return (
    <div className="p-4 pb-20">
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="레시피, 피드, 사용자 검색"
          className="pl-12 pr-4 py-3 rounded-full bg-gray-100 border-transparent focus:border-orange-500 focus:ring-orange-500 h-14 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {debouncedSearchTerm ? (
        <SearchResults results={searchResults as FeedItem[]} isLoading={searchLoading} />
      ) : (
        <div className="space-y-8">
          <PopularKeywords keywords={popularKeywords} isLoading={keywordsLoading} onKeywordClick={handleKeywordClick} />
          <PopularPosts posts={popularPosts as FeedItem[]} isLoading={postsLoading} />
        </div>
      )}
    </div>
  );
}
