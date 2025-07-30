'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, TrendingUp, User, Grid3X3 } from 'lucide-react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import PopularKeywords from '@/components/search/PopularKeywords';
import InstagramGridCard from '@/components/search/InstagramGridCard';
import UserCard from '@/components/search/UserCard';
import type { Item } from '@/types/item';
import { getPopularKeywordsCached, getPopularPostsCached, optimizedSearch, SearchMetrics } from '@/utils/search-optimization';
import { useFollowStore } from '@/store/followStore'; // �� 업계 표준: 글로벌 팔로우 상태

// 📊 서버 부담 최소화를 위한 페이지 크기
const PAGE_SIZE = 12;

// 🔄 검색 결과 타입
type SearchTab = 'content' | 'users';

// 👤 유저 검색 결과 타입
interface UserResult {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  items_count: number;
  latest_items: Item[];
}

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

// 🚀 무한스크롤을 위한 페이지네이션 fetcher
const getSearchPageKey = (pageIndex: number, previousPageData: Item[], searchTerm: string) => {
  if (!searchTerm.trim()) return null;
  if (previousPageData && previousPageData.length === 0) return null;
  
  return `search_page|${searchTerm}|${pageIndex}|${PAGE_SIZE}`;
};

// 🔄 SearchResult를 Item으로 변환
interface SearchResultType {
  id: string;
  title: string;
  content?: string;
  item_type: 'recipe' | 'post';
  created_at: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  user_id?: string;
  image_urls?: string[];
  tags?: string[];
  likes_count?: number;
  comments_count?: number;
  is_following?: boolean; // 🔧 추가: 팔로우 상태
  cooking_time_minutes?: number;
  servings?: number;
  color_label?: string;
  ingredients?: { name: string; amount: number; unit: string }[];
  instructions?: { step_number: number; description: string; image_url?: string }[];
}

const convertSearchResultToItem = (searchResult: SearchResultType): Item => {
  // ID 안전성 보장
  const safeId = searchResult.id || `temp-${Date.now()}-${Math.random()}`;
  
  return {
    id: safeId,
    item_id: safeId,
    user_id: searchResult.user_id || '',
    item_type: searchResult.item_type,
    title: searchResult.title || 'Untitled',
    description: searchResult.content || null,
    content: searchResult.content || null,
    image_urls: searchResult.image_urls || null,
    tags: searchResult.tags || null,
    created_at: searchResult.created_at || new Date().toISOString(),
    likes_count: searchResult.likes_count || 0,
    comments_count: searchResult.comments_count || 0,
    is_liked: false,
    is_following: searchResult.is_following || false, // 🔧 수정: 검색 결과에서 실제 팔로우 상태 사용
    is_public: true,
    display_name: searchResult.display_name || null,
    username: searchResult.username,
    avatar_url: searchResult.avatar_url || null,
    cooking_time_minutes: searchResult.cooking_time_minutes || null,
    servings: searchResult.servings || null,
    color_label: searchResult.color_label || null,
    recipe_id: null,
    cited_recipe_ids: null,
    ingredients: searchResult.ingredients || undefined,
    instructions: searchResult.instructions || undefined,
  };
};

const infiniteSearchFetcher = async (key: string): Promise<Item[]> => {
  const [, searchTerm, pageIndex, pageSize] = key.split('|');
  
  if (!searchTerm) return [];
  
  try {
    // 페이지네이션된 검색 결과
    const searchResults = await optimizedSearch.search(searchTerm);
    const startIndex = parseInt(pageIndex) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    
    // SearchResult[]를 Item[]로 변환
    const items = searchResults.slice(startIndex, endIndex).map(convertSearchResultToItem);
    
    return items;
  } catch (error) {
    console.error('❌ Infinite search failed:', error);
    return [];
  }
};

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('content'); // 🔄 탭 상태
  const { setFollowing } = useFollowStore() // 🚀 업계 표준: 글로벌 팔로우 상태 동기화
  const observerRef = useRef<HTMLDivElement>(null);

  const { data: popularKeywords, isLoading: keywordsLoading } = useSWR('popular_keywords', fetcher);
  const { data: popularPosts, isLoading: postsLoading } = useSWR('popular_posts', fetcher);
  
  // 🚀 무한스크롤 검색 결과
  const {
    data: searchPages,
    isLoading: searchLoading,
    isValidating: searchValidating,
    setSize,
    mutate: mutateSearch,
  } = useSWRInfinite(
    (pageIndex, previousPageData) => getSearchPageKey(pageIndex, previousPageData as Item[], debouncedSearchTerm),
    infiniteSearchFetcher,
    {
      revalidateFirstPage: true,  // 🔧 수정: 검색어가 바뀔 때 첫 페이지도 재검증
      revalidateOnFocus: false,
    }
  );

  // 🚀 검색어 디바운싱
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 🔧 검색어가 변경될 때 캐시 클리어 및 페이지 리셋
  useEffect(() => {
    if (debouncedSearchTerm) {
      setSize(1); // 페이지를 첫 페이지로 리셋
      mutateSearch(); // SWR 캐시 클리어
      optimizedSearch.clearCache(); // DebouncedSearch 캐시도 클리어
      console.log(`🔄 Search term changed to: "${debouncedSearchTerm}" - all caches cleared`);
    }
  }, [debouncedSearchTerm, setSize, mutateSearch]);

  // 🚀 무한스크롤 Intersection Observer
  useEffect(() => {
    if (!observerRef.current || !searchPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !searchLoading && !searchValidating) {
          setSize(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [searchPages, searchLoading, searchValidating, setSize]);

  const handleKeywordClick = (keyword: string) => {
    setSearchTerm(keyword);
  };

  // 👤 검색 결과에서 유저들을 추출하고 그룹화
  const processUserResults = (searchResults: Item[]): UserResult[] => {
    const userMap = new Map<string, UserResult>();
    
    searchResults.forEach(item => {
      if (!item.user_id || !item.username) return;
      
      if (userMap.has(item.user_id)) {
        const user = userMap.get(item.user_id)!;
        user.items_count++;
        if (user.latest_items.length < 3) {
          user.latest_items.push(item);
        }
      } else {
        userMap.set(item.user_id, {
          user_id: item.user_id,
          username: item.username,
          display_name: item.display_name || undefined,
          avatar_url: item.avatar_url || undefined,
          items_count: 1,
          latest_items: [item],
        });
      }
    });
    
    return Array.from(userMap.values());
  };

  // 검색 결과 평면화 (메모이제이션으로 무한 루프 방지)
  const searchResults = useMemo(() => {
    return searchPages?.filter(page => Array.isArray(page)).flat() || [];
  }, [searchPages]);
  
  const isLoadingMore = searchLoading || searchValidating;
  const isReachingEnd = searchPages && searchPages.length > 0 && searchPages[searchPages.length - 1]?.length < PAGE_SIZE;

  // 👤 유저 검색 결과 처리
  const userResults = useMemo(() => processUserResults(searchResults), [searchResults]);

  // 🚀 업계 표준: 검색 결과의 팔로우 상태를 글로벌 상태와 동기화 (무한 루프 방지)
  useEffect(() => {
    if (searchResults.length > 0) {
      searchResults.forEach((item: any) => {
        if (item.user_id && item.is_following !== undefined) {
          setFollowing(item.user_id, item.is_following);
        }
      });
      console.log(`✅ SearchPage: Synced follow state for ${searchResults.length} search results`);
    }
  }, [searchResults, setFollowing]);

  return (
    <div className="px-2 py-4 pb-20">
      {/* 🔍 Instagram 스타일 검색바 */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="레시피, 피드, 사용자 검색..."
          className="pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-transparent focus:border-orange-500 focus:ring-orange-500 h-14 text-base placeholder:text-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {debouncedSearchTerm ? (
        /* 🔍 검색 결과 - 탭 기반 */
        <div>
          {/* 📱 검색 결과 탭 */}
          <div className="flex items-center mb-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('content')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'content'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                콘텐츠 ({searchResults.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4" />
                사용자 ({userResults.length})
              </button>
            </div>
          </div>

          {/* 🔍 검색 결과 내용 */}
          {activeTab === 'content' ? (
            /* 📱 콘텐츠 탭 - Instagram 그리드 */
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Grid3X3 className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">레시피 & 레시피드</h2>
              </div>
              
              {searchResults.length === 0 && !searchLoading ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-2">콘텐츠 검색 결과가 없습니다</div>
                  <div className="text-gray-400 text-sm">다른 키워드로 검색해 보세요</div>
                </div>
              ) : (
                <>
                  {/* Instagram 3열 그리드 */}
                  <div className="grid grid-cols-3 gap-1 sm:gap-2">
                    {Array.isArray(searchResults) ? 
                      searchResults.filter(item => {
                        const hasId = item?.item_id || item?.id;
                        if (!hasId) {
                          console.warn('🚨 Search result missing ID:', item);
                        }
                        return hasId;
                      }).map((item, index) => (
                        <InstagramGridCard key={`search-${item.item_id || item.id}-${index}`} item={item} />
                      )) : []
                    }
                    
                    {/* 로딩 스켈레톤 */}
                    {isLoadingMore && Array.from({ length: 6 }).map((_, index) => (
                      <div key={`skeleton-${index}`} className="aspect-square bg-gray-200 rounded-sm animate-pulse" />
                    ))}
                  </div>
                    
                  {/* 무한스크롤 트리거 */}
                  {!isReachingEnd && (
                    <div ref={observerRef} className="h-10 flex items-center justify-center mt-4">
                      {isLoadingMore && <div className="text-sm text-gray-500">로딩 중...</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* 👤 사용자 탭 - 유저 카드 */
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">사용자</h2>
              </div>
              
              {userResults.length === 0 && !searchLoading ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-2">사용자 검색 결과가 없습니다</div>
                  <div className="text-gray-400 text-sm">다른 키워드로 검색해 보세요</div>
                </div>
              ) : (
                <div className="space-y-5">
                  {userResults.map((user: any) => (
                    <UserCard key={user.user_id} user={user} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 🏠 홈 화면 - 인기 콘텐츠 */
        <div className="space-y-5">
          <PopularKeywords 
            keywords={popularKeywords as { keyword: string }[]} 
            isLoading={keywordsLoading} 
            onKeywordClick={handleKeywordClick} 
          />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">인기 레시피 & 레시피드</h2>
            </div>
            
            {postsLoading ? (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {Array.from({ length: 12 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="aspect-square bg-gray-200 rounded-sm animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {Array.isArray(popularPosts) ? 
                  popularPosts.filter(item => {
                    const hasId = item?.item_id || item?.id;
                    if (!hasId) {
                      console.warn('🚨 Popular post missing ID:', item);
                    }
                    return hasId;
                  }).map((item, index) => (
                    <InstagramGridCard key={`popular-${item.item_id || item.id}-${index}`} item={item} />
                  )) : []
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}