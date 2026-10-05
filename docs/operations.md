# 운영 안내

배포, 환경 변수, 푸시, 분석, DB 변경, 관리 스크립트. 2026-10 코드 기준이며, 바뀌면 이 문서를 같이 고친다.
옛 안내는 `docs/legacy/2025/`에 기록으로만 남아 있다 (지금 코드와 다르다).

## 배포 (Netlify)

- `main`에 올리면 Netlify가 빌드한다: `npm run build` (`next build --webpack`), Node 22, 결과 `.next`.
- 함수 폴더는 `netlify/functions` (`netlify.toml`):
  - `push-dispatch`: 알림 저장 → DB 트리거 → 웹 푸시 발송
  - `send-push`: 알림 설정 화면의 테스트 발송
  - `sweep-orphan-images`: 매주(`@weekly`) 쓰지 않는 사진 정리
  - `process-onboarding-sources`: 매시 20분. 제출 시 즉시 처리하지 못한 `content_onboarding_sources`의 queued/failed 항목을 최대 5건 재시도한다. 별도 queue 서비스 없이 기존 `PUSH_WEBHOOK_SECRET` 보호 API를 호출한다.
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
| `PUSH_WEBHOOK_SECRET` | DB 트리거 → `push-dispatch`, 파트너 source 재처리 API 호출 검증 | **비밀** |
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
- `sweep-orphan-images`와 수동 `delete-orphan-images.py`는 DB 참조와 사용자 UUID Storage 폴더를 1,000개 단위로 끝까지 페이지네이션한 뒤 orphan을 판정한다. `marketing` 같은 운영 자산 prefix는 건드리지 않으며, 실제 삭제 직전 DB 참조를 다시 읽어 스캔 중 새로 연결된 사진을 제외한다.
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
- 주요 파일: `release_queue.sql`(나눠서 공개할 순서·Instagram 게시/성과 snapshot), `optimized_feed_view.sql`(피드 뷰), `item_stats.sql`(프로필·레시피북 통계 RPC), `growth_graph.sql`(관계·행동 기록), `growth_events_v2.sql`(성장 이벤트 타입 확장 migration), `discovery_and_behavior.sql`(탐색 순위·레시피 활동), `storage_owner_policies.sql`, `security_hardening.sql`.
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

- 목적은 자동화 자체가 아니라 `좋은 Recipe 공급 → 외부 수요 유입 → 첫 Recipe → 두 번째 Recipe → Recipe 관계 형성`이라는 성장 루프를 실제로 돌리는 것이다. Instagram 예약 게시 성과를 기다리기만 하지 않는다.
- 타깃 아웃리치 안내면은 `/partners` 허브 + `/partners/creators` + `/partners/brands`로 분리한다. 이 경로는 일반 탐색/검색 유입용 서비스 페이지가 아니라 아직 Spoonie 계정이 없는 외부 Creator/Brand에게 마케터가 직접 전달하는 acquisition funnel이므로 sitemap에서 제외하고 `noindex`를 유지한다. 크리에이터와 브랜드 모두 현재 제품을 직접 사용할 수 있는 콘텐츠 작성자다. 브랜드는 별도 제휴 없이 자사 제품을 실제로 활용한 Recipe/Recipeed를 올릴 수 있으며, 자사·협찬·제품 제공 관계를 프로필이나 본문에서 밝힌다. 현재 제품은 Creator↔Brand 매칭, 캠페인 중개, 도달·판매 보장을 제공하지 않는다.
- 기존 2026-10-04 발송분의 `/partners#creators`, `/partners#brands` 링크는 깨지지 않게 유지한다.
- Creator/Brand 전용 랜딩은 실제 공개 Recipe 화면 캡처와 실제 Recipe/프로필 링크를 proof로 사용한다. 생성형 이미지로 제품 동작을 가장하지 않는다.
- 파트너 가치 제안은 기능 이름에서 끝내지 않고 즉시 체감 효용부터 설명한다. Creator에게는 기존 SNS 콘텐츠 재입력 부담 감소, 반복되는 재료·분량 질문에 다시 쓸 수 있는 Recipe 링크, 피드가 지나간 뒤에도 프로필에 남는 백카탈로그가 1차 가치다. 참고·파생 관계는 누군가 실제로 만들거나 자기 버전을 올렸을 때 원본 Recipe와 작성자로 돌아오는 2차 가치로 설명한다. Brand에게는 흩어진 제품 활용법을 한곳에 누적하고 같은 조리법 링크를 다시 쓰며, 팬의 실제 사용·응용이 생겼을 때 원본 제품 활용 Recipe로 돌아올 수 있다는 효용을 먼저 설명한다.
- provenance는 공포 마케팅이나 법적 보증으로 쓰지 않는다. 레시피 도용·소송을 랜딩/콜드메일의 훅으로 사용하지 않고, Spoonie가 저작권을 부여·판단·보호하거나 법적 소유권을 증명한다고 표현하지 않는다. 공개 이력과 사용자가 선택한 참고/파생 관계가 플랫폼 안에서 보존된다는 사실만 말한다.
- 직접 작성 퍼널은 `partner_action` → `signup_submitted` → `partner_auth_complete` → `recipe_create` 순서로 본다. 자동 초기 셋업 퍼널은 `account_ready` → `onboarding_sources_submitted` → `processing` → `private_drafts_ready` → `reviewed` → `published` → 같은 작성자의 첫 native Recipe → 두 번째 native Recipe로 측정한다. Creator/Brand 모두 계정 소유가 source 제출보다 먼저이며, 생성 초안은 처음부터 해당 사용자 `user_id` 소유다. 제출 source에서 확인되지 않는 재료·분량·순서는 추정하지 않는다.
- 파트너 인증 화면은 전역 앱 내비게이션을 숨기고, Google 또는 이메일 가입/로그인과 비밀번호 복구가 모두 같은 `next`·partner source를 유지한다. 신규 파트너의 `display_name`이 비어 있으면 Recipe 작성 직전에 활동명/브랜드명 한 칸만 받고, 첫 partner Recipe 저장 후에는 홈이 아니라 방금 작성한 Recipe 상세를 보여준다.
- Creator와 Brand 파트너 랜딩은 분리 유지하고 제품 가치가 먼저다. 콜드 방문자는 Spoonie가 무엇인지, 자기 입장에서 어떤 효용이 있는지, 실제 기능이 어떻게 동작하는지를 시각적·상호작용 예시로 먼저 이해한다. 직접 가입 후 Recipe 작성이 기본 activation 경로이며, 기존 콘텐츠 초기 셋업은 첫 작성 마찰을 줄이는 보조 경로다. 보조 경로를 택한 경우에만 계정 생성/로그인 → source 제출 → 확인 가능한 값만 구조화 → 본인 계정 비공개 draft → 검수 → 기존 Recipe 저장 경로로 공개를 따른다. 영상은 source 분석에만 쓰고 Spoonie에는 동영상을 호스팅/게시하지 않는다.
- 비정형 source의 모델 보조 처리는 ChatGPT 예약 작업이 매시간 한 번씩 미처리 onboarding queue를 확인해 수행한다. deterministic 추출로 충분하지 않은 evidence만 의미 구조화하며, 원본 근거가 없는 값은 만들지 않고 needs_input/manual_review로 남긴다. 생성 결과는 항상 해당 사용자 소유의 비공개 draft이며 자동 공개하지 않는다.
- 기존 hash 링크는 브라우저에서 각각 전용 랜딩으로 `replace`하고, JavaScript가 없어도 허브의 동일 anchor에서 전용 페이지 CTA를 제공한다. 정정 메일은 보내지 않는다.
- 업무메일 운영: `hello@spoonie.kr`는 일반 문의, `partners@spoonie.kr`는 Creator/Brand 파트너 연락용 수신 주소다. 둘 다 Cloudflare Email Routing으로 기존 Gmail에 포워딩되며 Gmail에서는 `Spoonie/General`, `Spoonie/Partners` 라벨로 분류한다. 도메인 인증 발신 계층이 없는 동안 외부 발신은 실제 연결된 Gmail 주소를 숨기거나 위조하지 않는다. 대신 파트너 메일 본문/서명에 `partners@spoonie.kr`를 공식 연락처로 명시하고, replywatch는 해당 라벨과 기존 Gmail thread를 함께 본다. 수익화 전 별도 유료·trial·freemium SMTP/메일 발송 사업자를 도입하지 않는다.
- 파트너 랜딩은 운영정책·사업계획 설명서가 아니다. 각 타깃마다 `즉시 가치 → 현재 가능한 사용 예 → 한 가지 주 CTA`만 전면에 둔다. 미래 모델, 예외 조건, 정책 세부사항, 중복된 가치 설명은 랜딩에 누적하지 않고 운영 문서·약관·후속 응답으로 보낸다. 재귀 검토는 기본적으로 추가보다 삭제·통합을 우선한다.
- 외부 후보는 공개된 사업/제휴 채널만 사용한다. 개인정보/CS 전용 주소를 마케팅 목적으로 우회 사용하지 않는다. Creator supply의 후보 범위는 팔로워 수로 자르지 않는다. 본인이 권리를 가진 요리·레시피·릴스·주방 콘텐츠를 이미 공개하고 있고, 그중 1~5개를 구조화 Recipe로 다시 쓸 실익이 있는 계정이면 long-tail creator도 잠재사용자다. 기존 Recipe 백카탈로그가 크거나 분량·재료 질문이 반복되는 계정은 우선순위를 높인다. 운영 자원은 최신 `strategy_review` override를 따르고, Brand는 이미 유용한 레시피/serving idea를 만드는 소형·D2C 중심으로 좁힌다.
- 외부 홍보 운영의 주 원장은 `/Users/ojihun/DEV/media-agent-prm`의 Promotion Ops session `spoonie-growth`다. Creator/Brand/커뮤니티 타깃, owned social account, 채널 판정, 실제 email/post/community action과 external provider ID를 이 세션에 기록한다. Spoonie의 GA4·Supabase는 방문·가입·Recipe 생성·반복 사용 같은 제품 활성화의 진실 공급원으로 유지한다. 기존 `growth_outreach_targets` 13건은 PRM으로 이관됐으며 과거 dedupe/감사 원장으로만 병행 조회하고 신규 외부 CRM write의 기본 목적지로 쓰지 않는다.
- 발송 전 PRM `spoonie-growth` target/action, 기존 `growth_outreach_targets`, Gmail Sent를 함께 확인해 중복 접촉을 막는다. 일괄 복붙 대신 대상별 실제 적합 이유가 있을 때만 개인화한다.
- 첫 콜드메일은 기본적으로 세그먼트 랜딩 하나만 주 링크로 쓴다. Creator는 /partners/creators, Brand는 /partners/brands를 쓰고 utm_source=outreach, utm_medium=email과 세그먼트 campaign을 붙인다. 아직 의사가 확인되지 않은 수신자에게 랜딩 링크와 raw signup 링크를 동시에 나열하지 않는다. 가입 의사가 확인된 후에는 직접 Recipe 작성으로 이어지는 signup 경로를 안내할 수 있다.
- `growth_outreach_targets`는 서버 전용(RLS + browser policy 없음)으로 후보 유형, 공개 연락 채널, 적합 이유, 접촉/응답 상태, 다음 follow-up 시각, 외부 thread/message ID를 저장한다.
- 무응답 follow-up은 최초 연락 후 최소 7일 뒤 한 번만 하는 것을 기본으로 하고, 계속 무응답이면 중단한다. 답장이 오면 자동 반복 발송보다 응답 내용에 맞는 다음 행동을 우선한다.
- 브랜드 self-serve 아웃리치는 현재 좁은 실험 채널이다. `Creator를 연결해주겠다`는 제안으로 보내지 않으며, 이미 자사 레시피·serving idea·팬 조리 콘텐츠를 만드는 소형/D2C 브랜드가 실제 Recipe 1~3개를 직접 게시하는 시나리오가 명확할 때만 시도한다. Creator 매칭/유료 캠페인은 향후 별도 검증 영역이다.
- `profiles.entity_type`은 `person|organization`을 명시적으로 보관한다. 기존 계정은 `person`, Brand onboarding을 제출한 계정은 `organization`으로 표시하고 Profile/Recipe/Recipeed JSON-LD 작성자 타입에도 그대로 전파한다. 기존 `profiles.role`이나 이름 문자열로 브랜드 여부를 추측하지 않는다.
- Spoonie 홍보의 현금 예산은 0원이다. paid ads, 유료 인플루언서/크리에이터 게재, 협찬·노출비, 경품 구매, Spoonie 부담 쿠폰/할인 보조, 유료 acquisition tool 의존을 사용하지 않는다. 성과가 약하더라도 돈을 투입하는 방식으로 병목을 덮지 않고 타깃·메시지·콘텐츠·채널·제품 효용을 재설계한다.
- 모든 홍보는 상대가 실제로 얻는 무상 효용을 먼저 명시한다. Creator에게는 기존 레시피의 구조화·검색 가능 아카이브·프로필 축적·참고/파생 관계의 출처 연결·owned 채널 배포, Brand에게는 자체 제품 활용 Recipe의 무료 self-serve 게시·활용법 축적·팬/응용 Recipe 관계 가능성, 일반 사용자/커뮤니티에는 완결성 있는 요리 정보와 전체 Recipe 접근을 제공한다.
- 계약, 비용 집행, 독점/공식 파트너 표현, 법적·평판 리스크가 있는 조건은 사용자 승인 대상으로 올린다. 수익화 전 현금 예산은 0원이다. 유료 서비스뿐 아니라 나중에 유료 전환을 전제로 하는 trial/freemium 인프라를 실행 의존성으로 추가하지 않는다. 기존 로컬 자원과 이미 운영 중인 무료 인프라를 우선한다.
- owned Instagram의 주 역할은 Spoonie 자체를 반복 광고하는 것이 아니라 개별 Recipe의 유용성(분량·비율·대체재·실패 포인트·단계)을 배포해 특정 Recipe detail로 수요를 보내는 것이다. 서비스 소개형 게시물은 보조적으로만 쓴다.
- 커뮤니티 배포는 `서비스 홍보`가 아니라 완결성 있는 요리 정보가 먼저여야 한다. 해당 커뮤니티 규칙이 허용할 때만 Spoonie Recipe를 전체 분량/과정의 원문 또는 보충 링크로 사용한다.
- organic search는 현재 네트워크 규모와 무관하게 작동하는 핵심 demand 채널로 본다. Creator가 올린 Recipe의 검색 진입점이 누적되는지를 장기 성장 지표로 본다.
- Creator adoption의 핵심은 signup 자체가 아니라 `첫 공개 Recipe → 두 번째 공개 Recipe` 전환이다. 한 건만 올리고 끝나면 migration trial, 두 번째 이상부터 반복 사용 신호로 분류한다.

## 로컬 Growth 운영

- Spoonie의 외부 유입·아웃리치·응답 감시는 ChatGPT 예약 작업이 아니라 Mac launchd가 소유한다.
- 설치 스크립트: python3 scripts/growth/install_growth_launchd.py
- 실행기: scripts/growth/run_growth_automation.sh
- 로컬 상태/로그: ~/.spoonie-growth-automation/
- 초기 ignition 목표는 **외부 active cook 20명**이다. 여기서 active는 owner가 아닌 사용자가 가입 후 Recipe 공개, Recipeed/cook log 공개, 또는 두 번째 Recipe 관련 행동처럼 실제 cooking-network 행동을 한 경우다. 아직 실측 전환율이 없으므로 qualified touch → meaningful activation 5~10%는 계획용 범위일 뿐 성과 주장에 사용하지 않는다. 이 범위를 쓰면 20명 ignition에는 대략 200~400개의 서로 다른 고적합 접점이 필요하므로, 현재 몇 개의 Creator/커뮤니티/미디어 후보로 충분하다고 보지 않는다.
- Growth 운영의 기본 원칙은 **반복 빈도보다 breadth**다. 같은 대상·같은 채널에 반복 노출을 늘리지 말고 Instagram cooking graph, YouTube Creator, food blogger, 한국 요리 커뮤니티, Reddit food community, maker/product launch, media/newsletter, search/referral 등 서로 다른 표면과 대상을 계속 늘린다. PRM spoonie-growth의 7일 verified-pool 목표가 충족되기 전에는 discovery가 매 실행마다 최소 4개 channel family를 확인하고 가능한 경우 20개 이상의 신규 검증 후보/표면을 추가한다. 약한 후보로 숫자를 채우지 않는다.
- **전 채널 공통 일일 행동 상한은 없다.** 이메일이 3건 찼다고 community, launch, Instagram network, search/referral까지 멈추지 않는다. 대신 채널별 안전 상한을 적용한다: 신규 outbound email 합계 <=3/day, earned-media pitch <=1/day, community contribution <=2 distinct communities/day, bulk Instagram DM/comment automation 금지, maker/product launch는 platform/product-state당 1회, owned Recipe 게시 자체는 기존 스케줄을 따른다. 조사·발굴·큐 확장은 이 외부 행동 상한에 묶지 않는다.
- 예약은 lane별 launchd로 분리해 Discovery·Creator·Media·Instagram Network·Maker Launch·Brand·Referral·Strategy·Community·Replywatch·Review의 책임을 독립적으로 유지한다. Codex worker는 `research`와 `mutation` 두 그룹으로 분리한다. `discovery/strategy/review/smoke`는 research worker 1개를 공유하고, 외부 행동 가능성이 있는 creator/community/referral/brand/media/network/launch/replywatch/acquisition은 mutation worker 1개를 공유한다. 따라서 **조사·분석 1개와 외부행동 계열 1개는 동시에 실행 가능**하지만, 외부행동끼리는 중복 발송·게시·PRM/Gmail race를 막기 위해 직렬화한다. 이 직렬화는 채널 포트폴리오나 당일 확산의 전역 상한이 아니다.
  - com.spoonie.growth.discovery: 매일 08:45·14:15·21:45 KST. 20-active ignition에 필요한 후보 풀을 계속 확장한다. 발송·게시하지 않고 PRM에 검증된 후보와 reject evidence를 축적한다.
  - com.spoonie.growth.creator: 월~금 10:30·16:00 KST. email뿐 아니라 YouTube business contact, food-blogger public contact, 명시적으로 허용된 creator contact surface를 함께 다룬다. email은 별도 3/day 상한을 따르지만 다른 Creator subchannel 탐색까지 멈추지 않는다.
  - com.spoonie.growth.media: 월~금 09:40 KST. startup·food/foodtech·creator-economy·consumer/lifestyle media/newsletter를 계속 발굴하고, fit과 public pitch route가 검증된 경우에만 earned pitch를 KST 하루 최대 1건 보낸다.
  - com.spoonie.growth.network: 매일 11:00·19:00 KST. @spoonie.kitchen의 cooking/kitchen 관심 audience와 공개 adjacent graph를 founding-cook/creator discovery 및 참여 유도에 활용한다. PremaMon 서사는 절대 사용하지 않고 bulk DM/follow-unfollow/fake engagement를 하지 않는다.
  - com.spoonie.growth.launch: 매일 13:20 KST. Disquiet·GeekNews Show·Product Hunt 등 maker/product surface의 현재 규칙과 launch 상태를 점검하고, platform/product-state당 한 번의 정상 소개만 수행한다. 이미 소개한 표면은 feedback/measurement로 전환한다.
  - com.spoonie.growth.brand: 화·목 11:10 KST. 실제 product-use Recipe 자산이 있는 소형/D2C food/kitchen Brand를 조사한다. proactive outbound는 현재 PAUSE/narrow이며 다른 lane을 막지 않는다.
  - com.spoonie.growth.referral: 매일 13:45 KST. 현금·쿠폰·경품 없이 자연스러운 Recipe share/cook-along/referral surface를 찾고 실행한다.
  - com.spoonie.growth.strategy: 매일 14:35 KST. 활동량 보고가 아니라 acquisition breadth, target fit, activation과 second-action 신호를 반증·재배분한다.
  - com.spoonie.growth.community: 매일 12:30·20:30 KST. 한국 요리/집밥/1인가구 커뮤니티와 rule-compatible Reddit food community를 별개 표면으로 다룬다. 막힌 한 커뮤니티 때문에 전체 lane을 중단하지 않는다.
  - com.spoonie.growth.replywatch: 매시 25분. PRM/Gmail/partner inquiry와 onboarding 신규 제출·상태 변화를 확인한다.
  - com.spoonie.growth.review: 매일 22:30 KST. 15개 PRM channel portfolio 전체와 activation evidence를 함께 보고 EXPAND/KEEP/CHANGE/PAUSE/STOP을 판정한다.
  - owned Instagram Recipe 공개/게시 자체는 기존 Netlify 11:30·18:30 KST 스케줄을 유지한다.
- 모든 로컬 growth run은 해당 worker-group lock 획득 후 KST 당일 실제 email sent 수를 재계산해 **이메일에만** 신규 발송 상한 3건을 적용한다. 집계 실패 또는 잔여 0이면 새 email은 보내지 않지만 독립적인 community/network/launch/referral/discovery는 각자의 규칙대로 계속할 수 있다. research와 mutation worker가 동시에 checkpoint를 시도해 stale revision이 발생하면 최신 context/runtime를 다시 복원한 뒤 현재 revision으로 한 번 재시도하여 결과를 버리지 않는다. 의미 있는 실행 뒤에는 PRM action과 project context checkpoint에 검증 결과를 남긴다.
- 실행 lane과 전략 lane을 분리하되 서로 단절시키지 않는다. `strategy`는 활동량 보고가 아니라 현재 가정을 반증하려고 시도하고, `evidence → diagnosis → hypothesis → zero-cost experiment → expected signal → decision rule`을 PRM에 남긴다. 반복 실패 시 채널 증량보다 대상의 원래 니즈와 Spoonie가 무료로 줄 수 있는 가치로 원점회귀한다.
- 이 lane은 외부 growth 운영 전용이다. 제품 코드·공개 사이트 카피 수정, Git commit/push/deploy는 하지 않는다. 제품 마찰을 발견하면 정상 개발 세션에 구체적인 수정안으로 넘긴다.
- 폐업한 PremaMon과 Spoonie 사이의 브랜드/사업 연속성·전신·리브랜딩·기원 서사를 공개적으로 만들거나 언급하지 않는다. 현재 @spoonie.kitchen의 요리·주방 관심 audience와 공개 관계망만 warm distribution/discovery asset으로 활용한다.
