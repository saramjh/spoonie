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

미리 만드는 페이지는 로그인 정보를 읽지 않는다 (`shared/infra/supabase-public.ts`). 그래서 방문마다 서버 함수가 돌지 않는다. 내 좋아요·저장·비공개 글은 브라우저가 채운다.

## 코드 구조 (2026-10 리팩토링)

기능마다 같은 세 층으로 나눈다. 화면은 domain과 data만 부르고, DB·저장소는 data만 만진다.

```
src/
├─ app/                    라우트 (경로 그대로). 화면 조립만
├─ features/
│  ├─ recipe/  post/  social/  profile/  feed/  notification/
│  │  ├─ contracts.ts      입력·출력 타입 (실행 코드 없음)
│  │  ├─ domain/           순수 함수: React·Supabase·브라우저를 모른다. *.test.ts로 동작을 기록
│  │  ├─ data/             DB·저장소 읽기·쓰기 (Supabase 호출은 여기만)
│  │  └─ components/ hooks/ store/   그 기능만 쓰는 화면·훅·상태
├─ shared/
│  ├─ infra/               Supabase 클라이언트, SWR 캐시 도구, 캐시 관리자, 사진 올리기, 행동 기록, 실시간 이벤트
│  └─ lib/                 기능과 상관없는 순수 도구 (조사, 안전한 경로, 화면 출처, 썸네일, JSON-LD, 앱 설치)
├─ components/             여러 기능이 같이 쓰는 화면 (ui = 기본 부품, kit = Spoonie 화면 키트, items = 글 카드·좋아요·댓글, layout, common)
├─ hooks/ store/           여러 기능이 같이 쓰는 훅·상태 (세션)
├─ lib/utils.ts            cn() 하나 (shadcn 설정이 이 경로를 가리킨다)
└─ types/                  item.ts(앱 타입), database.ts(Supabase 자동 생성, 손대지 않음)
```

- 화면·훅에서 `supabase.from(...)`을 직접 쓰지 않는다. 필요한 조회·쓰기는 그 기능의 `data/`에 함수로 만든다 (서버 라우트 `app/api`, `app/auth`는 예외).
- 판단 로직(폼 기본값, 저장 값 만들기, 상태 계산)은 `domain/`에 두고 테스트를 붙인다: `npm test`(vitest).
- 새 폴더를 만들면 `tailwind.config.ts`의 `content`에 들어가는지 확인한다 (`src/features`, `src/shared`는 들어 있다).
- 알려진 문제: 레시피드 상세의 참고 레시피 제목 조회가 없는 표(`recipes`)를 본다 (`features/feed/data/item-detail.ts`의 `fetchCitedRecipeTitle`). 브라우저 Supabase 클라이언트가 두 개다(`shared/infra/supabase.ts` 기본 설정, `supabase-client.ts` PKCE 설정).

## 데이터 (Supabase)

- 클라이언트: 브라우저 `shared/infra/supabase-client.ts`, 미리 만드는 서버 페이지 `shared/infra/supabase-public.ts`(익명), API 라우트 `shared/infra/supabase-server.ts`(쿠키).
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
- **좋아요·저장·댓글·팔로우·글 추가·수정**은 `shared/infra/unified-cache-manager.ts`의 `cacheManager`로만 바꾼다. 화면을 먼저 바꾸고 DB에 쓰며, DB가 실패하면 화면을 되돌리고 오류를 던진다(부르는 쪽 catch가 안내). 상태는 절대값(좋아요함/안 함)으로 바꾸고, 같은 글·같은 동작은 차례대로 처리한다.
- **글 지우기**는 `cacheManager.deleteItems(ids)` 하나로. 모든 목록·상세 캐시에서 바로 빼고, 돌려받은 함수로 실패 시 목록을 다시 받는다.
- **키 앞부분으로 여러 캐시를 다시 받거나 고칠 때**는 `shared/infra/swr-cache.ts`(`revalidateStartingWith`, `updateStartingWith`)를 쓴다. SWR의 `mutate((key) => …)`는 무한 스크롤 목록(`$inf$` 키: 피드·레시피북)을 건너뛰어 닿지 않는다.
- **zustand**는 세션(`sessionStore`), 팔로우 상태(`followStore`), 레시피북 필터(`recipeStore`)만. 세션은 앱 시작 때 한 번, 그 뒤로는 Supabase 인증 이벤트(로그인·로그아웃)로 맞춘다 (`ClientLayoutWrapper`).
- 피드 다시 받기는 두 곳뿐이다. 탭 복귀(`usePageVisibility`)와 뒤로 가기로 홈 복귀(`ClientLayoutWrapper`). 주기적 조회(폴링)는 하지 않는다.
- 알림 숫자와 댓글은 필터를 건 실시간 구독(`useRealtimeRefresh`)으로 받는다.

## 화면 부품

- `components/kit`: 이 앱의 문법 (Sheet, SectionHeading, StateSheet, PageHeader, Photo, SourceRow, MadeProof, Magnet…). 새 화면은 여기서 조립한다.
- `components/ui`: shadcn 원본. 색은 역할 이름(primary, muted…)으로만 쓰고, 그 값은 `globals.css` 변수에서 온다.
- **스타일 소유권**
  - 바깥 여백·위치는 부르는 쪽이 `className`으로 정한다. 컴포넌트는 `cn()`으로 받아 자기 기본값보다 뒤에 둔다.
  - 색은 토큰으로만 쓴다 (DESIGN.md Tokens in code).

## 행동 기록과 발견

- 행동 기록: `shared/infra/events.ts`(쓰기)와 `shared/lib/surface.ts`(어느 화면에서 왔는지, 작성 화면의 돌아가기).
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

- 홈에서 드물게 "int64" 페이지 오류가 잡힌다(재현 안 됨). 홈에만 있는 외부 스크립트(애드센스)로 보이지만 확인 전이다.

