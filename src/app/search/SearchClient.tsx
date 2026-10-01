'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon, X } from 'lucide-react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import PopularKeywords from '@/components/search/PopularKeywords';
import MadeRecordTile from '@/components/search/MadeRecordTile';
import RecipeListCard from '@/components/recipe/RecipeListCard';
import { useExplore, type ExploreData } from '@/hooks/useExplore';
import UserCard from '@/components/search/UserCard';
import type { Item } from '@/types/item';
import { getPopularKeywordsCached, optimizedSearch, searchUsers, SearchMetrics, type UserSearchResult } from '@/utils/search-optimization';
import { useFollowStore } from '@/store/followStore';
import { useNavigation } from '@/hooks/useNavigation';
import { SectionHeading, StateSheet, UnderlineTabs } from "@/components/kit"

// 서버 부담 최소화를 위한 페이지 크기
const PAGE_SIZE = 12;

// 검색 결과 종류: 레시피(자산)가 먼저, 레시피드(활동)와 사람이 뒤 (DESIGN.md Interface Grammar 1)
type SearchTab = 'recipe' | 'post' | 'users';

// 유저 검색 결과 타입
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
      // 최적화된 캐시 기반 인기 키워드 조회
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

    case 'search':
      if (!query) return [];
      
      // 디바운싱된 최적화 검색 (콘텐츠용)
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

    case 'search_users':
      if (!query) return [];
      
      // 유저네임 전용 검색
      const userSearchStartTime = performance.now();
      try {
        const userResults = await searchUsers(query);
        const userSearchEndTime = performance.now();
        SearchMetrics.recordSearch(userSearchEndTime - userSearchStartTime, false);
        return userResults;
      } catch (error) {
        SearchMetrics.recordError();
        console.error('❌ User search failed:', error);
        return [];
      }

    default:
      return null;
  }
};

// 무한스크롤을 위한 페이지네이션 fetcher
const getSearchPageKey = (pageIndex: number, previousPageData: Item[], searchTerm: string) => {
  if (!searchTerm.trim()) return null;
  if (previousPageData && previousPageData.length === 0) return null;
  
  return `search_page|${searchTerm}|${pageIndex}|${PAGE_SIZE}`;
};

// SearchResult를 Item으로 변환
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
  is_liked?: boolean; // 추가: 좋아요 상태
  is_following?: boolean; // 추가: 팔로우 상태
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
    is_liked: searchResult.is_liked || false, // 검색 결과에서 실제 좋아요 상태 사용
    is_following: searchResult.is_following || false, // 수정: 검색 결과에서 실제 팔로우 상태 사용
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
    thumbnail_index: 0, // 기본 썸네일 인덱스
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

// 검색어가 없을 때의 탐색 목록은 서버가 미리 그린 것(initialExplore)으로 시작한다: 검색엔진이 레시피 링크를 읽고, 첫 화면에 빈칸이 없다
export default function SearchClient({ initialExplore }: { initialExplore?: ExploreData | null }) {
  // Smart Navigation: 이 페이지를 거쳐간 navigation history 추적
  useNavigation({ trackHistory: true })

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [tab, setTab] = useState<SearchTab | null>(null); // 고르기 전에는 결과가 있는 첫 종류
  const { setFollowing } = useFollowStore() // 업계 표준: 글로벌 팔로우 상태 동기화
  const observerRef = useRef<HTMLDivElement>(null);

  const { data: popularKeywords, isLoading: keywordsLoading } = useSWR('popular_keywords', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1분간 중복 요청 방지
  });
  const { data: explore, isLoading: exploreLoading } = useExplore(initialExplore);

  // 무한스크롤 검색 결과
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
      revalidateFirstPage: true,  // 수정: 검색어가 바뀔 때 첫 페이지도 재검증
      revalidateOnFocus: false,
    }
  );

  // 검색어 디바운싱
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setTab(null);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 사용자 검색 결과 (유저네임 전용)
  const userSearchKey = debouncedSearchTerm ? `search_users|${debouncedSearchTerm}` : null;

  
  const { data: userSearchResults, isLoading: userSearchLoading } = useSWR(
    userSearchKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30초간 중복 요청 방지
    }
  );

  // 검색어가 변경될 때 캐시 클리어 및 페이지 리셋
  useEffect(() => {
    if (debouncedSearchTerm) {
      setSize(1); // 페이지를 첫 페이지로 리셋
      mutateSearch(); // SWR 캐시 클리어
      optimizedSearch.clearCache(); // DebouncedSearch 캐시도 클리어

    }
  }, [debouncedSearchTerm, setSize, mutateSearch]);

  // 무한스크롤 Intersection Observer
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

  // 유저네임 검색 결과를 UserResult 인터페이스에 맞게 변환
  const convertUserSearchResults = (results: UserSearchResult[]): UserResult[] => {
    return results.map(user => ({
      user_id: user.user_id,
      username: user.username,
      display_name: user.display_name || undefined,
      avatar_url: user.avatar_url || undefined,
      items_count: user.items_count,
      latest_items: [], // 유저네임 검색에서는 latest_items 불필요
    }));
  };

  // 검색 결과 평면화 (메모이제이션으로 무한 루프 방지)
  const searchResults = useMemo(() => {
    return searchPages?.filter(page => Array.isArray(page)).flat() || [];
  }, [searchPages]);
  
  const isLoadingMore = searchLoading || searchValidating;
  const isReachingEnd = searchPages && searchPages.length > 0 && searchPages[searchPages.length - 1]?.length < PAGE_SIZE;

  // 유저 검색 결과 처리 (유저네임 전용 검색 결과 사용)
  const userResults = useMemo(() => {

    
    if (!userSearchResults || !Array.isArray(userSearchResults)) {
      return [];
    }
    return convertUserSearchResults(userSearchResults);
  }, [userSearchResults]);

  // 업계 표준: 검색 결과의 팔로우 상태를 글로벌 상태와 동기화 (무한 루프 방지)
  useEffect(() => {
    if (searchResults.length > 0) {
      searchResults.forEach((item: Item) => {
        if (item.user_id && item.is_following !== undefined) {
          setFollowing(item.user_id, item.is_following);
        }
      });

    }
  }, [searchResults, setFollowing]);



  const recipeResults = searchResults.filter((item) => item.item_type === 'recipe');
  const postResults = searchResults.filter((item) => item.item_type !== 'recipe');
  const activeTab: SearchTab = tab ?? (recipeResults.length > 0 || (postResults.length === 0 && userResults.length === 0) ? 'recipe' : postResults.length > 0 ? 'post' : 'users');
  const searchEmpty = (
    <StateSheet title={`'${debouncedSearchTerm}'에 맞는 결과가 없어요`} body="재료 이름이나 요리 이름으로 찾아 보세요." />
  );

  return (
    <div className="min-h-screen">
      <div className="px-2 py-4 pb-20">
      {/* Instagram 스타일 검색바 */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft" />
        <Input
          type="text"
          placeholder="레시피, 피드, 사용자 검색..."
          className={`pl-12 ${searchTerm ? 'pr-12' : 'pr-4'} h-12 text-base`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {/* 유튜브 스타일 X 버튼 (검색어가 있을 때만 표시) */}
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center"
            aria-label="검색어 지우기"
          >
            <X className="h-5 w-5 text-ink-soft" aria-hidden />
          </button>
        )}
      </div>

      {debouncedSearchTerm ? (
        <div>
          <UnderlineTabs
            label="검색 결과 종류"
            className="mb-3 bg-transparent"
            stretch={false}
            value={activeTab}
            onChange={setTab}
            items={[
              { key: 'recipe', label: '레시피', count: recipeResults.length },
              { key: 'post', label: '레시피드', count: postResults.length },
              { key: 'users', label: '사람', count: userResults.length },
            ]}
          />

          {activeTab === 'recipe' &&
            (recipeResults.length === 0 && !searchLoading ? (
              searchEmpty
            ) : (
              <div className="space-y-2">
                {recipeResults.map((item, index) => (
                  <RecipeListCard key={`search-${item.item_id || item.id}`} item={item} showAuthor priority={index < 3} />
                ))}
              </div>
            ))}

          {activeTab === 'post' &&
            (postResults.length === 0 && !searchLoading ? (
              searchEmpty
            ) : (
              <div className="grid grid-cols-3 gap-x-1 gap-y-3">
                {postResults.map((item, index) => (
                  <MadeRecordTile key={`search-${item.item_id || item.id}`} item={item} priority={index < 3} />
                ))}
              </div>
            ))}

          {activeTab !== 'users' && (
            <>
              {isLoadingMore && <p className="py-4 text-center text-sm text-ink-soft">찾는 중...</p>}
              {!isReachingEnd && <div ref={observerRef} className="h-10" />}
            </>
          )}

          {activeTab === 'users' &&
            (userSearchLoading ? (
              <p className="py-12 text-center text-ink-soft">사람을 찾는 중...</p>
            ) : userResults.length === 0 ? (
              searchEmpty
            ) : (
              <div className="space-y-5">
                {userResults.map((user: UserResult) => (
                  <UserCard key={user.user_id} user={user} />
                ))}
              </div>
            ))}
        </div>
      ) : (
        /* 탐색: 레시피가 중심, 만들어 본 기록이 그 레시피로 돌려보낸다 */
        <div className="space-y-6">
          <PopularKeywords
            keywords={popularKeywords as { keyword: string }[]}
            isLoading={keywordsLoading}
            onKeywordClick={handleKeywordClick}
          />

          <section aria-labelledby="explore-recipes">
            <SectionHeading id="explore-recipes" className="mb-2 px-1">레시피</SectionHeading>
            {exploreLoading && !explore ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[88px] animate-pulse rounded-[3px] bg-paper/70" />
                ))}
              </div>
            ) : explore && explore.recipes.length > 0 ? (
              <div className="space-y-2">
                {explore.recipes.map((item, index) => (
                  <RecipeListCard key={item.id} item={item} showAuthor priority={index < 3} />
                ))}
              </div>
            ) : (
              <StateSheet title="아직 공개된 레시피가 없어요" />
            )}
          </section>

          {explore && explore.made.length > 0 && (
            <section aria-labelledby="explore-made">
              <SectionHeading id="explore-made" className="px-1">요즘 만들어 본 기록</SectionHeading>
              <p className="mb-2 mt-0.5 px-1 text-[13px] text-ink-soft">사진 아래가 만든 레시피예요.</p>
              <div className="grid grid-cols-3 gap-x-1 gap-y-3">
                {explore.made.map(({ item, sourceTitle }) => (
                  <MadeRecordTile key={item.id} item={item} sourceTitle={sourceTitle} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </div>
  );
}