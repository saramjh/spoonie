# 운영 안내

배포, 환경 변수, 푸시, 분석, DB 변경, 관리 스크립트. 2026-10 코드 기준이며, 바뀌면 이 문서를 같이 고친다.
옛 안내는 `docs/legacy/2025/`에 기록으로만 남아 있다 (지금 코드와 다르다).

## 배포 (Netlify)

- `main`에 올리면 Netlify가 빌드한다: `npm run build` (`next build --webpack`), Node 22, 결과 `.next`.
- 함수 폴더는 `netlify/functions` (`netlify.toml`):
  - `push-dispatch`: 알림 저장 → DB 트리거 → 웹 푸시 발송
  - `send-push`: 알림 설정 화면의 테스트 발송
  - `sweep-orphan-images`: 매주(`@weekly`) 쓰지 않는 사진 정리
  - `release-queued-recipes`: 매일 11:30·18:30(한국 시간) `release_queue` 맨 앞의 비공개 레시피 하나를 공개 (공개 시각을 작성 시각으로). 이어서 인스타그램 @spoonie.kitchen에 그 레시피 사진(최대 10장)과 캡션을 확인 없이 게시.
  - `retry-instagram-posts`: 13:00·15:00·20:00·22:00(한국 시간) 공개는 건드리지 않고 실패한 인스타그램 게시만 재시도한다. 알 수 없는/일시 오류는 15분→1시간→6시간→24시간 간격으로 최대 5회 재시도한다. 성공 게시 사이에는 최소 3시간 간격을 두고 실행당 최대 1건만 게시해 backlog가 연속 노출되지 않게 한다. 인증·권한 오류와 `media_publish` 전송 결과가 불명확한 경우는 중복 게시 방지를 위해 terminal 상태로 남겨 수동 확인한다. 상태는 `instagram_media_id`, `instagram_error`, `instagram_attempt_count`, `instagram_next_retry_at`, `instagram_terminal_error`에 기록한다.
  - `collect-instagram-insights`: 매시 10분에 Instagram 게시 성과를 확인한다. 실제 게시 후 24~30시간, 72~78시간 구간에서만 `reach/likes/comments/saved/shares/total_interactions/profile_activity/profile_visits/follows`를 한 번씩 저장하며 당시 팔로워 수와 실제 관측 나이(분)도 함께 남긴다. 구간을 놓친 경우 늦은 누적값을 24h/72h처럼 저장하지 않고 `missed`로 표시한다.
  - 새 Instagram 게시물은 `cta_v1` 실험으로 기록한다. release order 짝수는 `save`, 홀수는 `site` CTA를 사용한다. hook은 `recipe_title_v1`, slide 전략은 `hero_gallery_steps_v1`로 고정해 첫 실험에서는 CTA만 바꾼다. 기존 게시물은 `baseline_v0/site`로 구분한다.
- `/api/*`는 Next.js가 처리한다 (리다이렉트를 두지 않는다).
- 보안 헤더(CSP 포함)도 `netlify.toml`에 있다. 외부 스크립트·수집 주소를 늘리면 여기 `script-src`·`connect-src`도 같이 늘린다.

## 환경 변수

| 이름 | 쓰는 곳 | 비밀 |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | 공유 주소, 사이트맵, 메타데이터 (`https://spoonie.kr`) | 아님 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저·서버 Supabase 클라이언트 | 아님 (공개 키) |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_ITEMS` | 사진 저장소 이름 | 아님 |
| `SUPABASE_SECRET_KEY` | 탈퇴 API, 푸시 함수, 사진 정리 함수, 관리 스크립트 | **비밀** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PUBLIC_KEY` | 푸시 구독(브라우저) / 발송(함수). 같은 값 | 아님 |
| `VAPID_PRIVATE_KEY` | 푸시 발송 함수 | **비밀** |
| `PUSH_WEBHOOK_SECRET` | DB 트리거 → `push-dispatch` 호출 검증 | **비밀** |
| `NEXT_PUBLIC_GA_ID` | GA4 측정 ID (없으면 `G-16DKDXVQ9T`) | 아님 |
| `NEXT_PUBLIC_ADSENSE_ID` | 애드센스 게시자 ID | 아님 |
| `NEXT_PUBLIC_ADSENSE_ENABLED` | `true`일 때만 광고 스크립트를 싣는다. 지금은 꺼 둠(설정 안 함) | 아님 |
| `INSTAGRAM_ACCESS_TOKEN` | 인스타그램 자동 게시 첫 토큰 (메타 개발자 앱의 장기 토큰). 30일마다 함수가 갱신해 DB `instagram_credentials`에 저장 | **비밀** |
| `NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS` | `true`면 GA를 싣지 않는다 (개발 환경용) | 아님 |

로컬은 `.env.local`(git 제외), 운영은 Netlify 환경 변수. 비밀 값은 대화·문서·커밋에 적지 않는다.

## 웹 푸시

1. 키 만들기: `node scripts/generate-vapid-keys.js`. 공개 키는 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`·`VAPID_PUBLIC_KEY`, 개인 키는 `VAPID_PRIVATE_KEY`.
   키를 바꾸면 기존 구독은 브라우저가 다음 방문 때 새 키로 다시 구독한다 (`usePushNotification`).
2. DB: `supabase/notifications_triggers.sql` → `supabase/push_dispatch.sql` 순서로 적용.
3. `push_dispatch.sql` 주석의 쿼리로 vault의 `push_webhook_secret`을 읽어 Netlify `PUSH_WEBHOOK_SECRET`에 넣는다.
4. 흐름: 알림 행 저장 → 트리거가 `pg_net`으로 `/.netlify/functions/push-dispatch` 호출 → 함수가 비밀 값 확인 후 발송. 문구는 함수가 알림 종류별로 정한다.

## 콘텐츠 저장·검색 자산 갱신

- 레시피 쓰기/수정은 Supabase 함수 `save_recipe_atomic`을 사용한다. 스키마 재구축 시 `supabase/save_recipe_atomic.sql`을 적용한다. 일반 사용자는 `SECURITY INVOKER` + 현재 RLS를 그대로 따르고, `scripts/import-photo-recipes.py`만 service-role로 명시한 작성자 ID를 전달해 같은 원자 저장 경로를 쓴다. anon 실행 권한은 없다.
- 새 이미지의 400/800px variant 생성은 게시 성공 조건이다. 각 variant를 최대 3번 재시도하고 실패하면 새 원본과 생성 중인 variant를 정리한 뒤 저장을 중단한다.
- 글 작성·수정·삭제 후 `/api/revalidate`가 상세, 홈, 검색, `/recipes`, 프로필, `/sitemap.xml`, `/llms.txt`, 영향받은 `/topics/*`를 즉시 갱신한다. 예약 공개 함수는 `PUSH_WEBHOOK_SECRET`으로 보호된 `/api/revalidate-published`를 호출해 같은 갱신을 한다. 정적 `revalidate` 시간은 이 호출이 실패했을 때의 폴백이다.
- `/sitemap.xml`은 최근 N개가 아니라 현재 적격 canonical 전체를 배치 조회하고, Recipe/Recipeed의 실제 이미지 URL도 image sitemap으로 제공한다. URL이 50,000개에 접근하면 sitemap index로 분할한다.

## 앱 설치 (PWA)

- 설치 정보는 `public/manifest.json` (`id`·`scope`는 `/`). 웹 푸시는 VAPID라 `gcm_sender_id`를 두지 않는다.
- 삼성 인터넷으로 설치하면 Play 프로텍트가 "안전하지 않은 앱 차단됨"을 띄운다 (삼성 인터넷이 만드는 앱 껍데기가 옛 안드로이드 기준). 코드로 고칠 수 없어서 크롬으로 넘긴다 (`shared/lib/install.ts`):
  - 홈 화면 맨 위에 삼성 인터넷 방문자에게만 안내 한 줄과 "크롬에서 열기" (닫으면 그 기기에서는 다시 안 띄움)
  - 프로필 수정의 "앱으로 설치": 크롬·엣지는 설치 창, 삼성 인터넷은 크롬에서 열기, 아이폰은 "홈 화면에 추가" 안내

## 광고

- 애드센스는 꺼 두었다 (2026-10). 방문이 적은 시기에는 수익이 거의 없고, 빈 피드의 광고는 첫인상과 속도를 해친다.
- `public/ads.txt`와 애드센스의 사이트 소유 확인은 유지한다. 다시 켤 때는 `NEXT_PUBLIC_ADSENSE_ENABLED=true`.
- 켜도 콘텐츠가 있는 화면(홈 피드·탐색·상세·프로필)에서만 싣는다. 피드에 섞는다면 "광고" 표시를 붙이고 카드 8~10개에 하나 정도로, 레시피 상세의 재료·단계와 요리 모드에는 넣지 않는다.

## 분석과 검색 노출

- GA4: 속성 `properties/499223400`. 태그는 `components/analytics/GoogleAnalytics.tsx` (gtag 표준 설치, 화면 이동은 향상된 측정이 센다). `shared/infra/events.ts`가 feed impression과 social/growth funnel 이벤트를 GA4에도 보낸다. 홈 카드 노출은 고빈도라 Supabase에 저장하지 않는다.
- 서치 콘솔(`sc-domain:spoonie.kr`, DNS 확인), 빙 웹마스터, 네이버 서치어드바이저에 `https://spoonie.kr/sitemap.xml` 제출됨.
- 색인 범위: 공개 Recipe는 기본 index, 정상 공개 Recipeed도 기본 index 후보다. 빈 글·placeholder·반복/링크 스팸만 자동 제외한다. Topic과 Profile은 별도 gate를 사용한다 (`docs/discovery-and-behavior.md`).
- 서치 콘솔·GA·빙 조회는 Composio CLI로 할 수 있다 (`composio execute <도구> -d '{…}'`).

## DB 변경

- 스키마·함수·정책은 `supabase/*.sql`에 파일로 남기고, Supabase MCP의 마이그레이션으로 적용한다. 파일과 적용 내용이 같아야 한다.
- 주요 파일: `release_queue.sql`(나눠서 공개할 순서·Instagram 게시/성과 snapshot), `optimized_feed_view.sql`(피드 뷰), `growth_graph.sql`(관계·행동 기록), `growth_events_v2.sql`(성장 이벤트 타입 확장 migration), `discovery_and_behavior.sql`(탐색 순위·레시피 활동), `storage_owner_policies.sql`, `security_hardening.sql`.
- 점검 쿼리: `supabase/queries/growth_loop.sql`.

## 관리 스크립트 (`scripts/`)

| 스크립트 | 하는 일 |
|---|---|
| `generate-vapid-keys.js` | 푸시 VAPID 키 한 쌍 만들기 |
| `backfill-image-variants.py` | 이미 올라간 사진에 400·800px 버전 만들기 (macOS `sips`) |
| `delete-orphan-images.py [--apply]` | 어떤 글에서도 쓰지 않는 사진 지우기 (`--apply` 없으면 목록만) |

두 파이썬 스크립트는 `.env.local`의 `SUPABASE_SECRET_KEY`를 쓴다.

## 무료 요금제에서 할 수 없는 것

- 유출 비밀번호 차단(Supabase Pro 전용).
- Postgres 보안 패치: Supabase가 업그레이드를 열어 줄 때 대시보드에서 적용한다.


## Proactive acquisition

- 목적은 자동화 자체가 아니라 실제 고적합 사용자·크리에이터·브랜드 유입이다. Instagram 예약 게시 성과를 기다리기만 하지 않는다.
- 공개 안내면은 `/partners` 허브 + `/partners/creators` + `/partners/brands`로 분리한다. 크리에이터와 브랜드 모두 현재 제품을 직접 사용할 수 있는 콘텐츠 작성자다. 브랜드는 별도 제휴 없이 자사 제품을 실제로 활용한 Recipe/Recipeed를 올릴 수 있으며, 자사·협찬·제품 제공 관계를 프로필이나 본문에서 밝힌다. 현재 제품은 Creator↔Brand 매칭, 캠페인 중개, 도달·판매 보장을 제공하지 않는다.
- 기존 2026-10-04 발송분의 `/partners#creators`, `/partners#brands` 링크는 깨지지 않게 유지한다.
- Creator/Brand 전용 랜딩은 실제 공개 Recipe 화면 캡처와 실제 Recipe/프로필 링크를 proof로 사용한다. 생성형 이미지로 제품 동작을 가장하지 않는다.
- 파트너 랜딩의 세그먼트 진입, 실제 Recipe/프로필 열기, 사이트 이동, signup, 문의 제출은 GA4 `partner_action` 이벤트로 측정한다. `partner_segment`, `partner_action` 파라미터로 구분하고, 실제 문의 내용은 별도 서버 전용 `partner_inquiries`에 저장한다.
- 외부에서 직접 들어온 파트너는 전용 문의 폼을 사용한다. 폼은 `/api/partner-inquiry`를 통해서만 저장하며 `partner_inquiries`는 RLS 활성화 + anon/authenticated 권한 없음으로 브라우저 직접 접근을 막는다. 아웃리치 수신자는 기존 메일에 그대로 회신해도 된다.
- 기존 hash 링크는 브라우저에서 각각 전용 랜딩으로 `replace`하고, JavaScript가 없어도 허브의 동일 anchor에서 전용 페이지 CTA를 제공한다. 정정 메일은 보내지 않는다.
- 파트너 랜딩은 운영정책·사업계획 설명서가 아니다. 각 타깃마다 `즉시 가치 → 현재 가능한 사용 예 → 한 가지 주 CTA`만 전면에 둔다. 미래 모델, 예외 조건, 정책 세부사항, 중복된 가치 설명은 랜딩에 누적하지 않고 운영 문서·약관·후속 응답으로 보낸다. 재귀 검토는 기본적으로 추가보다 삭제·통합을 우선한다.
- 외부 후보는 공개된 사업/제휴 채널만 사용한다. 개인정보/CS 전용 주소를 마케팅 목적으로 우회 사용하지 않는다. 현재 acquisition의 목표는 계약 체결보다 실제 Recipe 작성 사용자 확보이며, Recipe를 직접 만들 수 있는 요리 크리에이터와 자사 활용 Recipe를 자체 제작할 수 있는 식품·주방 브랜드를 모두 유효한 공급 측 사용자로 본다.
- 발송 전 `growth_outreach_targets`와 Gmail Sent를 모두 확인해 중복 접촉을 막는다. 일괄 복붙 대신 대상별 실제 적합 이유가 있을 때만 개인화한다.
- `growth_outreach_targets`는 서버 전용(RLS + browser policy 없음)으로 후보 유형, 공개 연락 채널, 적합 이유, 접촉/응답 상태, 다음 follow-up 시각, 외부 thread/message ID를 저장한다.
- 무응답 follow-up은 최초 연락 후 최소 7일 뒤 한 번만 하는 것을 기본으로 하고, 계속 무응답이면 중단한다. 답장이 오면 자동 반복 발송보다 응답 내용에 맞는 다음 행동을 우선한다.
- 브랜드 self-serve 아웃리치는 현재 가능하지만, `Creator를 연결해주겠다`는 제안으로 보내지 않는다. 브랜드가 자체적으로 만들 수 있는 실제 Recipe 1~3개를 Spoonie에 직접 게시하는 사용 시나리오가 명확한 경우에만 제안한다. Creator 매칭/유료 캠페인은 향후 별도 검증 영역이다.
- 현재 프로필 데이터에는 개인/조직 entity type이 없다. 첫 실제 브랜드 계정이 활성화되기 전까지 이름·소개 문구로 브랜드 여부를 추측하거나 기존 `profiles.role`을 재활용하지 않는다. 첫 브랜드 계정 활성화 시 명시적 `person|organization` 프로필 타입을 도입하고 Profile/Recipe/Recipeed JSON-LD의 작성자 타입까지 함께 전파하는 것을 기술 게이트로 처리한다.
- 계약, 비용 집행, 독점/공식 파트너 표현, 법적·평판 리스크가 있는 조건은 사용자 승인 대상으로 올린다.
