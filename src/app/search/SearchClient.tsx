'use client'

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, X } from 'lucide-react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';

import PopularKeywords from '@/features/feed/components/PopularKeywords';
import MadeRecordTile from '@/features/feed/components/MadeRecordTile';
import RecipeListCard from '@/features/recipe/components/RecipeListCard';
import { useExplore, type ExploreData } from '@/features/feed/hooks/useExplore';
import UserCard from '@/features/feed/components/UserCard';
import type { Item } from '@/types/item';
import { fetchPopularKeywords, searchItems, searchUsers, SEARCH_PAGE_SIZE, type SearchResult } from '@/features/feed/data/search-optimization';
import { useFollowStore } from '@/features/social/store/followStore';
import { SectionHeading, StateSheet, UnderlineTabs } from "@/components/kit"

// 검색 결과 종류: 레시피(자산)가 먼저, 레시피드(활동)와 사람이 뒤 (DESIGN.md Interface Grammar 1)
type SearchTab = 'recipe' | 'post' | 'users';

const convertSearchResultToItem = (searchResult: SearchResult): Item => {
  return {
    id: searchResult.id,
    item_id: searchResult.id,
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

// Each tab is paged on the server. One extra result signals another page.
function useItemSearchPages(query: string, type: "recipe" | "post") {
  const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRInfinite(
    (index, previous: Item[] | null) =>
      query && (index === 0 || (previous && previous.length > SEARCH_PAGE_SIZE))
        ? ["search_items", query, type, index] as const : null,
    ([, term, kind, index]) =>
      searchItems(term, kind, index * SEARCH_PAGE_SIZE)
        .then(rows => rows.filter(row => row.id).map(convertSearchResultToItem)),
    { revalidateOnFocus: false, revalidateFirstPage: false }
  );
  const results = useMemo(() => (data ?? []).flatMap(page => page.slice(0, SEARCH_PAGE_SIZE)), [data]);
  const hasMore = (data?.at(-1)?.length ?? 0) > SEARCH_PAGE_SIZE;
  return { results, error, isLoading, isValidating, mutate, hasMore, loadMore: () => setSize(size + 1) };
}

// 검색어가 없을 때의 탐색 목록은 서버가 미리 그린 것(initialExplore)으로 시작한다: 검색엔진이 레시피 링크를 읽고, 첫 화면에 빈칸이 없다
export default function SearchClient({ initialExplore }: { initialExplore?: ExploreData | null }) {

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [tab, setTab] = useState<SearchTab | null>(null); // 고르기 전에는 결과가 있는 첫 종류
  const { setFollowing } = useFollowStore() // 업계 표준: 글로벌 팔로우 상태 동기화

  const { data: popularKeywords, isLoading: keywordsLoading } = useSWR('popular_keywords', fetchPopularKeywords, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1분간 중복 요청 방지
  });
  const { data: explore, isLoading: exploreLoading } = useExplore(initialExplore);

  const recipesSearch = useItemSearchPages(debouncedSearchTerm, 'recipe');
  const postsSearch = useItemSearchPages(debouncedSearchTerm, 'post');
  const recipeResults = recipesSearch.results;
  const postResults = postsSearch.results;

  // 검색어 디바운싱
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
      setTab(null);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 사용자 검색 결과 (유저네임 전용)
  const userSearchKey = debouncedSearchTerm ? ['search_users', debouncedSearchTerm] : null;

  
  const { data: userSearchResults, isLoading: userSearchLoading, error: userSearchError, mutate: retryUserSearch } = useSWR(
    userSearchKey,
    ([, query]) => searchUsers(query),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30초간 중복 요청 방지
    }
  );

  const handleKeywordClick = (keyword: string) => {
    setSearchTerm(keyword);
  };

  const userResults = userSearchResults ?? []

  // Keep the existing follow-state sync for all loaded recipe and post pages.
  useEffect(() => {
    [...recipeResults, ...postResults].forEach(item => {
      if (item.user_id && item.is_following !== undefined) {
        setFollowing(item.user_id, item.is_following);
      }
    });
  }, [recipeResults, postResults, setFollowing]);

  const activeTab: SearchTab = tab ??
    (recipeResults.length > 0 || recipesSearch.isLoading || (postResults.length === 0 && userResults.length === 0)
      ? 'recipe' : postResults.length > 0 ? 'post' : 'users');
  const searchEmpty = (
    <StateSheet title={`'${debouncedSearchTerm}'에 맞는 결과가 없어요`} body="재료 이름이나 요리 이름으로 찾아 보세요." />
  );
  const searchFailed = (
    <StateSheet title="검색 결과를 불러오지 못했어요" body="연결 상태를 확인하고 다시 시도해 주세요."
      action={<Button type="button" onClick={() => void (activeTab === 'post' ? postsSearch.mutate() : recipesSearch.mutate())}>다시 시도</Button>} />
  );
  const userSearchFailed = (
    <StateSheet title="사람 검색을 완료하지 못했어요" body="연결 상태를 확인하고 다시 시도해 주세요."
      action={<Button type="button" onClick={() => void retryUserSearch()}>다시 시도</Button>} />
  );

  return (
    <div className="min-h-screen">
      <div className="px-3 pb-20 pt-3">
      <form role="search" className="mb-5 flex items-center gap-2" onSubmit={(event) => {
        event.preventDefault()
        setDebouncedSearchTerm(searchTerm.trim())
        setTab(null)
      }}>
        <div className="relative min-w-0 flex-1">
          <Input
            type="search"
            placeholder="레시피·재료·사람 검색"
            aria-label="검색"
            className={searchTerm ? "h-12 pr-11" : "h-12"}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} type="button"
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
              aria-label="검색어 지우기">
              <X className="h-5 w-5 text-ink-soft" aria-hidden />
            </button>
          )}
        </div>
        <Button type="submit" variant="outline" aria-label="검색 실행"
          className="h-12 w-11 flex-shrink-0 rounded-lg px-0">
          <SearchIcon className="h-5 w-5" aria-hidden />
        </Button>
      </form>

      {debouncedSearchTerm ? (
        <div>
          <UnderlineTabs
            label="검색 결과 종류"
            className="mb-3 bg-transparent"
            stretch={false}
            value={activeTab}
            onChange={setTab}
            items={[
              { key: 'recipe', label: '레시피', count: recipesSearch.hasMore ? undefined : recipeResults.length },
              { key: 'post', label: '레시피드', count: postsSearch.hasMore ? undefined : postResults.length },
              { key: 'users', label: '사람', count: userResults.length },
            ]}
          />

          {activeTab === 'recipe' &&
            (recipesSearch.error ? (
              searchFailed
            ) : recipeResults.length === 0 && !recipesSearch.isLoading ? (
              searchEmpty
            ) : (
              <div className="space-y-2">
                {recipeResults.map((item, index) => (
                  <RecipeListCard key={`search-${item.item_id || item.id}`} item={item} showAuthor priority={index < 3} />
                ))}
                {recipesSearch.hasMore && <Button type="button" variant="outline" className="w-full" disabled={recipesSearch.isValidating} onClick={() => void recipesSearch.loadMore()}>{recipesSearch.isValidating ? "불러오는 중…" : "레시피 더 보기"}</Button>}
              </div>
            ))}

          {activeTab === 'post' &&
            (postsSearch.error ? (
              searchFailed
            ) : postResults.length === 0 && !postsSearch.isLoading ? (
              searchEmpty
            ) : (
              <div className="grid grid-cols-3 gap-x-1 gap-y-3">
                {postResults.map((item, index) => (
                  <MadeRecordTile key={`search-${item.item_id || item.id}`} item={item} priority={index < 3} />
                ))}
                {postsSearch.hasMore && <div className="col-span-3"><Button type="button" variant="outline" className="w-full" disabled={postsSearch.isValidating} onClick={() => void postsSearch.loadMore()}>{postsSearch.isValidating ? "불러오는 중…" : "레시피드 더 보기"}</Button></div>}
              </div>
            ))}

          {activeTab === 'users' &&
            (userSearchError ? (
              userSearchFailed
            ) : userSearchLoading ? (
              <p className="py-12 text-center text-ink-soft">사람을 찾는 중...</p>
            ) : userResults.length === 0 ? (
              searchEmpty
            ) : (
              <div className="space-y-5">
                {userResults.map((user) => (
                  <UserCard key={user.user_id} user={user} />
                ))}
              </div>
            ))}
        </div>
      ) : (
        /* 탐색: 레시피가 중심, 만들어 본 기록이 그 레시피로 돌려보낸다 */
        <div className="space-y-6">
          <PopularKeywords
            keywords={popularKeywords}
            isLoading={keywordsLoading}
            onKeywordClick={handleKeywordClick}
          />

          <section aria-labelledby="explore-recipes">
            <SectionHeading id="explore-recipes" className="mb-2 px-1">레시피</SectionHeading>
            {exploreLoading && !explore ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[88px] rounded-[3px]" />
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
              <p className="mb-2 mt-0.5 px-1 text-meta text-ink-soft">사진 아래가 만든 레시피예요.</p>
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