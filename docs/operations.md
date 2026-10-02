# 운영 안내

배포, 환경 변수, 푸시, 분석, DB 변경, 관리 스크립트. 2026-10 코드 기준이며, 바뀌면 이 문서를 같이 고친다.
옛 안내는 `docs/legacy/2025/`에 기록으로만 남아 있다 (지금 코드와 다르다).

## 배포 (Netlify)

- `main`에 올리면 Netlify가 빌드한다: `npm run build` (`next build --webpack`), Node 22, 결과 `.next`.
- 함수 폴더는 `netlify/functions` (`netlify.toml`):
  - `push-dispatch`: 알림 저장 → DB 트리거 → 웹 푸시 발송
  - `send-push`: 알림 설정 화면의 테스트 발송
  - `sweep-orphan-images`: 매주(`@weekly`) 쓰지 않는 사진 정리
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
| `NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS` | `true`면 GA를 싣지 않는다 (개발 환경용) | 아님 |

로컬은 `.env.local`(git 제외), 운영은 Netlify 환경 변수. 비밀 값은 대화·문서·커밋에 적지 않는다.

## 웹 푸시

1. 키 만들기: `node scripts/generate-vapid-keys.js`. 공개 키는 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`·`VAPID_PUBLIC_KEY`, 개인 키는 `VAPID_PRIVATE_KEY`.
   키를 바꾸면 기존 구독은 브라우저가 다음 방문 때 새 키로 다시 구독한다 (`usePushNotification`).
2. DB: `supabase/notifications_triggers.sql` → `supabase/push_dispatch.sql` 순서로 적용.
3. `push_dispatch.sql` 주석의 쿼리로 vault의 `push_webhook_secret`을 읽어 Netlify `PUSH_WEBHOOK_SECRET`에 넣는다.
4. 흐름: 알림 행 저장 → 트리거가 `pg_net`으로 `/.netlify/functions/push-dispatch` 호출 → 함수가 비밀 값 확인 후 발송. 문구는 함수가 알림 종류별로 정한다.

## 광고

- 애드센스는 꺼 두었다 (2026-10). 방문이 적은 시기에는 수익이 거의 없고, 빈 피드의 광고는 첫인상과 속도를 해친다.
- `public/ads.txt`와 애드센스의 사이트 소유 확인은 유지한다. 다시 켤 때는 `NEXT_PUBLIC_ADSENSE_ENABLED=true`.
- 켜도 콘텐츠가 있는 화면(홈 피드·탐색·상세·프로필)에서만 싣는다. 피드에 섞는다면 "광고" 표시를 붙이고 카드 8~10개에 하나 정도로, 레시피 상세의 재료·단계와 요리 모드에는 넣지 않는다.

## 분석과 검색 노출

- GA4: 속성 `properties/499223400`. 태그는 `components/analytics/GoogleAnalytics.tsx` (gtag 표준 설치, 화면 이동은 향상된 측정이 센다).
- 서치 콘솔(`sc-domain:spoonie.kr`, DNS 확인), 빙 웹마스터, 네이버 서치어드바이저에 `https://spoonie.kr/sitemap.xml` 제출됨.
- 색인 범위: 레시피와 공개 레시피가 있는 프로필만. 레시피드는 `noindex, follow` (`docs/discovery-and-behavior.md`).
- 서치 콘솔·GA·빙 조회는 Composio CLI로 할 수 있다 (`composio execute <도구> -d '{…}'`).

## DB 변경

- 스키마·함수·정책은 `supabase/*.sql`에 파일로 남기고, Supabase MCP의 마이그레이션으로 적용한다. 파일과 적용 내용이 같아야 한다.
- 주요 파일: `optimized_feed_view.sql`(피드 뷰), `growth_graph.sql`(관계·행동 기록), `discovery_and_behavior.sql`(탐색 순위·레시피 활동), `storage_owner_policies.sql`, `security_hardening.sql`.
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
