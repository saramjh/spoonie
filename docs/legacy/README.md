# 레거시 기록

지난 작업의 보고서와 안내. **지금 코드와 맞지 않는다.** 역사 기록으로만 남긴다.
현행 기준은 `docs/architecture.md`(구조), `docs/operations.md`(운영), `docs/discovery-and-behavior.md`(발견·행동 유도), `DESIGN.md`, `PRODUCT.md`다.

## 2025/ (2024-12 ~ 2025-08 작성)

| 파일 | 내용 | 지금과 다른 점 |
|---|---|---|
| DEPLOYMENT-CHECKLIST.md, netlify-deployment-guide.md, free-tier-deployment-guide.md | Netlify 배포 안내 | 옛 환경 변수 이름(`SUPABASE_SERVICE_ROLE_KEY`)과 설정. 현행은 operations.md |
| PUSH_NOTIFICATION_SETUP.md | 푸시 설정 | 발송 구조가 바뀜(DB 트리거 → push-dispatch). 개인 키 값은 보관하며 지움(이미 교체된 키). 현행은 operations.md |
| analytics-adsense-setup.md | GA·애드센스 | GA 설치 방식이 바뀜(gtag 표준) |
| data-manager-guide.md | DataManager 사용법 | DataManager는 없음. 현행은 architecture.md의 화면 상태 |
| error-handling-audit-report.md, item-detail-error-fix-report.md, improvement-strategy-guide.md | 감사·수정 보고, 개선 전략 | 언급한 monitoring.ts·secure-schemas 등은 지워짐 |
| seo-2025-strategy.md, seo-implementation-analysis.md | SEO 전략·분석 | FAQ 구조화 데이터 등 "구현됨"으로 적힌 것 중 실제로 없는 것이 있음 |
| toss-adsense-placement-strategy.md, toss-notification-ux-guide.md, toss-profile-edit-improvement-strategy.md | 화면 전략 | 지금 디자인 언어는 DESIGN.md |
