# 발견과 행동 유도 규칙

스푸니의 탐색 순위, 행동 계기(CTA), 작성자 피드백을 정하는 규칙. 코드가 이 문서를 따르고, 규칙을 바꾸면 이 문서부터 고친다.
구현 위치: `supabase/discovery_and_behavior.sql`(get_explore, get_recipe_activity), `src/shared/lib/surface.ts`, `src/shared/infra/events.ts`, `src/components/recipe/RecipeActivity.tsx`, `src/hooks/useExplore.ts`.

## 헌법

1. 레시피와 레시피드는 서로 다른 **1급 공개 콘텐츠**다. 레시피는 구조화된 요리법이고, 레시피드는 음식·요리·주방·식생활의 사진·글 기록이다. 레시피드는 레시피에서 파생될 수도 있지만 독립적인 일상·경험일 수도 있다.
2. 사람의 인기는 좋은 글의 결과일 뿐, 다음 글에 자동으로 주는 특권이 아니다. 팔로워 수는 순위에 쓰지 않는다.
3. 출처 표시(귀속)와 노출 가산(분배)은 따로 판단한다. 사용자가 고른 출처는 표시하되 점수는 낮게 준다.
4. 계기는 사람이 이미 하려는 순간에만 둔다. 스크롤 중 가로막기, 재촉 알림, 포인트·순위표·연속 기록은 쓰지 않는다.
5. 검색 노출은 게시물마다 운영자가 지정하지 않는다. 원본 콘텐츠의 index eligibility, Topic 기여, Profile eligibility는 중앙 정책에서 서로 다른 질문으로 판정하고 각 표면이 그 판정을 재사용한다.

## 검색·GEO 노출 정책

### 콘텐츠 역할

- **레시피**: 만드는 방법을 찾는 수요의 기본 검색 자산. 공개 레시피는 index 대상이다.
- **레시피드**: 음식·요리·주방·식생활의 실제 경험과 일상. 참고 레시피는 선택 관계이며 색인의 필수 조건이 아니다.
- **주제(`/topics/{tag}`)**: 레시피와 레시피드를 같은 음식·재료·도구·상황 주제로 묶는 발견 표면이다.
- **프로필**: 식별 가능한 작성자와 실제 공개 활동을 연결하는 출처/정체성 표면이다. Recipeed의 index 여부를 그대로 복사하지 않는다.

### 레시피드 자동 색인

`src/features/discovery/domain/search-exposure.ts`의 순수 함수가 모든 공개 레시피드에 같은 규칙을 적용한다. DB에 게시물별 SEO 플래그를 두지 않는다.

- 정상적인 공개 Recipeed는 본문 길이·사진 장수·태그 수로 선별하지 않고 기본적으로 index 후보로 둔다. 사진 한 장과 짧은 실제 기록도 원본 콘텐츠다.
- 빈 글, 테스트/placeholder, 반복 문구로 늘인 글, 짧은 다중 링크 스팸처럼 독립 공개 콘텐츠로 보기 어려운 명백한 제외 사유만 공통 정책으로 차단한다.
- 좋아요, 댓글 수, 팔로워 수, 작성자 인기도는 index eligibility에 쓰지 않는다. 검색 노출이 인기 계정에 자기강화되지 않게 하기 위해서다.
- 정보량과 주제 명확성은 Topic 기여나 내부 추천 우선순위에서 별도로 사용할 수 있으며, Recipeed index 허용과 같은 boolean으로 취급하지 않는다.
- 장기 트래픽 우위나 '색인 이력 복리'는 보장하지 않는다. 현재 정책의 목적은 정상 원본의 발견·검색·이미지/AI retrieval 기회를 닫지 않는 것이다.

### 주제 자동 노출

- 저장 시 태그에서 앞의 `#`, 중복, 불필요한 공백을 정규화한다.
- 상세/피드의 태그는 `/topics/{tag}`로 연결한다.
- 주제 페이지는 해당 태그의 공개 레시피와 레시피드를 함께 보여 준다.
- Topic 기여는 Recipeed index eligibility와 별도 판정한다. 태그 자체가 구체적이고 기여 자산이 2개 이상이어야 하며, 기본적으로 서로 다른 작성자 2명 이상이 같은 주제를 썼을 때 index/sitemap 대상이 된다. 한 작성자만 있는 경우에는 기여 자산이 4개 이상 축적되어야 한다. `오늘`, `일상`, `기록`처럼 검색 의도가 약한 일반 태그는 자산 수와 무관하게 index하지 않는다.

### 검색 표면 동기화

중앙 정책의 서로 다른 판정을 각 표면에서 재사용한다. Recipeed index, Topic 기여, Profile eligibility를 하나의 boolean으로 합치지 않는다.

- `/posts/{id}` robots
- `/sitemap.xml`의 적격 canonical 전체와 콘텐츠 이미지 발견 경로
- `/profile/{id}` 색인 여부
- `/llms.txt`의 공개 레시피드·주제 목록
- `/topics/{tag}` 색인 여부

작성·수정·삭제 뒤에는 `/api/revalidate`가 본인 소유권을 확인한 뒤 상세, 홈, 검색, 레시피 목록, 프로필, sitemap, llms.txt와 이전/현재 태그의 topic 경로를 즉시 재검증한다. 시간 기반 revalidate는 장애 시 폴백이다.

전체 공개 자산 조회는 생성일·ID의 안정적인 순서로 페이지를 읽고, DB가 요청보다 작은 응답을 반환해도 실제 받은 행 다음부터 계속 읽는다. 빈 응답을 받은 뒤에만 끝낸다. sitemap에는 작성자와 조리 단계 사진도 같은 방식으로 누락 없이 읽어 넣는다. 일시 조회 실패는 ISR 재생성 실패로 처리해 기존 정상 sitemap/llms 응답을 유지한다. 프로필 변경도 sitemap·llms 갱신 경로에 포함한다.

`/llms.txt`는 전체 공개 목록에서 정상 노출 후보를 먼저 판정한 뒤 종류별 최근 최대 200개를 싣는다. 주제 집계는 표시 상한 이전의 전체 기여 자산을 사용한다. 이 파일은 1시간 ISR을 사용하며 Google 검색 성과를 보장하는 자산으로 취급하지 않는다.


`SocialMediaPosting`은 레시피드 전체의 콘텐츠 타입을 설명한다. 상세 캐러셀은 모든 사진을 초기 HTML에 남기고, sitemap에도 실제 이미지 URL을 함께 싣는다. 참고 레시피가 있을 때만 `sharedContent` 관계를 추가하며, 독립 레시피드를 억지로 Recipe 파생 콘텐츠로 만들지 않는다.

## 근거와 판정

| 의도 | 근거 | 판정 |
|---|---|---|
| 레시피 화면·요리 모드에서 바로 기록, 출처 자동 연결 | 기본값이 행동을 결정 (Johnson & Goldstein, 2003). 행동은 동기·능력·계기가 겹칠 때 일어남 (Fogg, 2009) | 적용 |
| 요리 완료 화면에서 "사진으로 남기기" | 경험의 끝이 기억과 다음 행동을 좌우 (Kahneman 외, 1993, 피크엔드) | 적용 |
| 요리를 시작했지만 기록이 없는 사람에게, 그 레시피를 다시 열었을 때 한 번 권함 | 구체적인 "언제·무엇을" 계기가 실행을 높임 (Gollwitzer, 1999) | 적용 (30일 안, 알림 없음) |
| 작성자에게 내 레시피가 실제로 쓰인 결과를 보여 줌 | 첫 기여에 반응을 받은 신규 사용자가 계속 기여함 (Burke, Marlow & Lento, 2009). 유능감을 주는 정보형 피드백은 내적 동기를 키움 (Ryan & Deci, 2000) | 적용 (본인만, 비교 없음) |
| 인기 독점 완화 | 인기 수치를 보여 주면 불평등과 예측 불가능성이 커짐 (Salganik, Dodds & Watts, 2006). 누적 우위 (Merton, 1968). 추천의 인기 편향 (Abdollahpouri 외, 2019) | 적용: 최근 30일만, 작성자 상한 |
| 새 작성자의 탐색 기회 | 노출의 공정성 (Singh & Joachims, 2018) | 적용: 새 레시피 1자리 |
| 비교·통제형 보상(팔로워 경쟁, 포인트) 배제 | 외적 보상이 내적 동기를 깎을 수 있음 (Deci, Koestner & Ryan, 1999). 게임화 효과는 엇갈림 (Hamari 외, 2014) | 적용 |
| 홈은 최신순 유지 | 반응 기반 정렬은 사용자가 원한다고 답한 것과 어긋날 수 있음 (Kleinberg 외, 2022; Milli 외, 트위터 무작위 실험) | 적용: 최신순이 기본. 같은 날짜 안에서 같은 작성자 3연속일 때만 가까운 다른 작성자를 한 칸 끌어옴 |
| 노출 대비 반응률, 베이지안 보정 | 작은 표본의 비율은 믿을 수 없음 (Wilson 하한 등) | 측정만 시작: 홈 카드 50% 노출을 GA4로 기록. 순위 반영은 데이터가 충분해질 때까지 보류 |
| LLM으로 관계 판정·관심사 프로필 | 이용이 적을 때 개인화는 동질화를 키움 (Chaney 외, 2018) | 보류 |

## 탐색 순위 (get_explore)

- 대상: 공개 레시피. 점수에는 **작성자 본인을 뺀 서로 다른 사람 수**만, **최근 30일** 활동만 센다.
- 점수 = 4 × 출처가 확인된 만듦(레시피 화면·요리 모드에서 시작) + 2 × 이어진 레시피 + 2 × 요리 완료 + 1.5 × 사용자가 고른 출처로 남긴 기록 + 1 × 저장 + 0.5 × 좋아요.
- 한 작성자는 목록에 최대 2개.
- 21일 안에 올라왔고 점수가 2 미만인 레시피 중 가장 새것 하나를 3번째 자리에 둔다.
- 점수가 모두 같으면(지금처럼 활동이 적으면) 최신순.
- "요즘 만들어 본 기록"은 레시피에 이어진 공개 레시피드. 같은 레시피와 같은 사람은 각각 최대 2개.
- 가중치는 근거 없이 정한 첫 값이다. 아래 "다시 정할 때"의 조건이 되면 데이터로 다시 정한다.

## 행동 기록 (events)

측정은 비용과 목적에 따라 두 층으로 나눈다.

- **GA4**: 비회원까지 포함한다. 홈 카드가 50% 이상 보이면 세션 중 해당 카드 첫 노출을 `feed_impression`으로 기록하고, `detail_open`, `follow/unfollow`, `share`, `recipeed_start`, `recipeed_create`, `related_open` 등 성장 funnel 이벤트도 보낸다.
- **Supabase `events`**: 로그인 사용자의 저빈도 행동만 저장한다. 카드 노출은 행이 너무 많이 생기므로 DB에는 쓰지 않는다. 분석 저장 실패는 UI 동작을 막지 않는다.

| type | item_id | origin |
|---|---|---|
| feed_impression | 보인 글 | home — **GA4 전용** |
| detail_open | 연 글 | 온 화면: home, search, recipe, post, profile, recipebook, notifications, bookmarks, external |
| profile_open | 온 글 (글에서 왔을 때) | `온 화면\\|본 사람 id` |
| cook_start, cook_complete | Recipe | cook_mode |
| recipeed_start | 출처 Recipe | recipe_detail / cook_mode |
| recipeed_create | 새 Recipeed | `recipe_detail:<source id>`, `cook_mode:<source id>`, manual |
| derived_create | 새 Recipe | fork |
| follow, unfollow | 없음 | home, detail, profile, follow_list 등 |
| share | 공유한 글 | home, bookmarks, detail |
| related_open | 이동한 글 | `recipe_made:<source>`, `continued:<source>`, `sibling:<source>` |

저장은 bookmarks 표, Recipe↔Recipeed/Recipe 관계는 content_relations 표에서도 별도로 센다. SQL 점검은 `supabase/queries/growth_loop.sql`, 비회원·노출 funnel은 GA4에서 본다.

## 다시 정할 때

- 공개 레시피 50개, 한 달 기록한 사람 30명이 넘으면: growth_loop.sql로 단계별 전환을 보고 가중치를 다시 정한다.
- 탐색에서 같은 레시피가 4주 넘게 1위면: 30일 창을 줄이거나 누적 상한을 둔다.
- 노출 대비 반응률은 GA4 `feed_impression`으로 먼저 관측한다. DB 기반 정교한 exposure 모델이 필요해져도 카드마다 Supabase 행을 쓰지 말고 배치/집계를 먼저 설계한다.
