# 스푸니 구조 지도

어떤 일을 어디서 맡는지. 새 코드를 넣기 전에 여기서 맡는 곳을 찾고, 없으면 만든 뒤 이 문서에 적는다.

## 화면 그리기 (Next.js App Router, Netlify)

| 경로 | 방식 | 갱신 |
|---|---|---|
| `/` 홈 | 미리 만든 HTML (공개 피드 첫 페이지) | 5분, 브라우저가 이어서 로그인 상태를 채움 |
| `/recipes/[id]`, `/posts/[id]`, `/profile/[id]` | 첫 방문 때 만들어 CDN에 둠 (ISR) | 10분, 글을 고치거나 지우면 `/api/revalidate`로 즉시 |
| `/search` | 탐색 목록을 미리 만든 HTML | 10분. 검색 결과는 브라우저가 받음 |
| `/sitemap.xml` | 공개 데이터로 생성 | 1시간 |
| 나머지 (레시피북, 알림, 작성·수정) | 브라우저에서 그림 | |

미리 만드는 페이지는 로그인 정보를 읽지 않는다 (`lib/supabase-public.ts`). 그래서 방문마다 서버 함수가 돌지 않는다. 내 좋아요·저장·비공개 글은 브라우저가 채운다.

## 데이터 (Supabase)

- 클라이언트: 브라우저 `lib/supabase-client.ts`, 미리 만드는 서버 페이지 `lib/supabase-public.ts`(익명), API 라우트 `lib/supabase-server.ts`(쿠키).
- 권한은 RLS가 정한다. 화면에서 `is_public`으로 다시 거르지 않는다 (본인 비공개 글이 사라진다).
- DB 정의는 `supabase/*.sql`에 둔다. 적용은 Supabase MCP로 하고, 같은 내용을 파일로 남긴다.
  - 피드 뷰: `optimized_feed_view.sql`
  - 관계 그래프·행동 기록: `growth_graph.sql`
  - 탐색 순위·레시피 활동: `discovery_and_behavior.sql`
  - 알림·푸시: `notifications_triggers.sql`, `push_dispatch.sql`

## 화면 상태

- **서버 데이터는 SWR**이 가진다. 키 규칙:
  - 피드: `items|페이지|사용자`
  - 글 하나: `itemDetail|id` (카드·상세·목록이 모두 이 캐시를 따른다)
  - 검색: `search_page|`, `search_users|`, `popular_keywords`
  - 탐색: `explore|v2`
  - 프로필: `user_items_*`, `follow_counts_*`, `lineage_counts_*`
  - 저장 목록: `bookmarks_*`
  - 목록 창: `likers|`, `follow_list|`
  - 레시피 활동: `recipeActivity|`
- **좋아요·저장·댓글·팔로우·글 추가/삭제**는 `lib/unified-cache-manager.ts`의 `cacheManager`로만 바꾼다. 화면을 먼저 바꾸고 DB에 쓰며, 실패하면 되돌린다.
- **zustand**는 세션(`sessionStore`), 팔로우 상태(`followStore`), 레시피북 필터(`recipeStore`)만.
- 피드 다시 받기는 두 곳뿐이다. 탭 복귀(`usePageVisibility`)와 뒤로 가기로 홈 복귀(`ClientLayoutWrapper`). 주기적 조회(폴링)는 하지 않는다.
- 알림 숫자와 댓글은 필터를 건 실시간 구독(`useRealtimeRefresh`)으로 받는다.

## 화면 부품

- `components/kit`: 이 앱의 문법 (Sheet, SectionHeading, StateSheet, PageHeader, Photo, SourceRow, MadeProof, Magnet…). 새 화면은 여기서 조립한다.
- `components/ui`: shadcn 원본. 색은 역할 이름(primary, muted…)으로만 쓰고, 그 값은 `globals.css` 변수에서 온다.
- **스타일 소유권**
  - 바깥 여백·위치는 부르는 쪽이 `className`으로 정한다. 컴포넌트는 `cn()`으로 받아 자기 기본값보다 뒤에 둔다.
  - 색은 토큰으로만 쓴다 (DESIGN.md Tokens in code).

## 행동 기록과 발견

- 행동 기록: `lib/events.ts`(쓰기)와 `lib/surface.ts`(어느 화면에서 왔는지, 작성 화면의 돌아가기).
- 순위·권유 규칙: `docs/discovery-and-behavior.md`.

## 서버 함수 (비용이 드는 곳)

- `/api/revalidate`: 글 수정·삭제 때 미리 만든 페이지 갱신 (작성자 확인)
- `/api/delete-user`: 탈퇴
- `/api/test-push`: 개발 환경 전용
- Netlify Functions:
  - `push-dispatch`: DB 트리거 → 웹 푸시
  - `send-push`: 알림 설정의 테스트 발송
  - `sweep-orphan-images`: 매주, 쓰지 않는 사진 정리

## 서비스워커 (`next.config.mjs`)

- Supabase API·인증 응답은 캐시하지 않는다.
- 올린 사진과 글꼴은 캐시를 먼저 쓴다.
- 분석·광고 요청에는 손대지 않는다.
- 새 버전이 넘겨받으면, 사용자가 탭을 떠나 있을 때 새로 연다 (`ServiceWorkerUpdater`).

## 남은 빚

- `unified-cache-manager.ts`(약 1,000줄)가 화면별 캐시 모양을 하나하나 안다. 키와 모양을 `lib`의 한 모듈로 모으면 줄일 수 있다.
- `any` 타입 경고 44개 (대부분 Supabase 응답 매핑).
- 이름에 남은 옛 표기: `TossSeamlessProfileEditor`, `Simplified*`, `useSSAItemCache`.
