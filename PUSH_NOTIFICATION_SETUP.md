# 🆓 무료 푸시 알림 시스템 설정 가이드

이 가이드는 Netlify + Supabase를 사용하여 **완전 무료**로 푸시 알림을 설정하는 방법을 설명합니다.

## ✅ 완료된 구현 사항

- ✅ Web Push API 기반 푸시 알림 시스템
- ✅ Netlify Functions를 활용한 무료 푸시 서버
- ✅ Supabase를 이용한 구독 정보 관리
- ✅ Service Worker 푸시 이벤트 처리
- ✅ 사용자 친화적인 설정 UI
- ✅ VAPID 키 생성 스크립트

## 🔧 설정 단계

### 1. 환경변수 설정

생성된 VAPID 키를 환경변수에 추가하세요:

```bash
# .env.local 파일에 추가
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BGKcJ-bNjWPUzj2AV_OchO_n1nICzyicrZmT6uNlfyZj5n7_0N3-8QO-q-yPyumNUf7z4GBzpYDy29OJMQ6Gb9Y
```

### 2. Netlify 환경변수 설정

Netlify 대시보드에서 다음 환경변수를 설정하세요:

1. Netlify 대시보드 → Settings → Environment variables
2. 다음 변수들을 추가:

```
VAPID_PUBLIC_KEY=BGKcJ-bNjWPUzj2AV_OchO_n1nICzyicrZmT6uNlfyZj5n7_0N3-8QO-q-yPyumNUf7z4GBzpYDy29OJMQ6Gb9Y
VAPID_PRIVATE_KEY=kLtzeewnRKOAlAi98GLRvGb6i09VI67F0bFxoD0TssQ
```

### 3. Supabase 테이블 생성

```sql
-- migrations/add_push_notifications_table.sql 실행
-- Supabase Dashboard → SQL Editor에서 실행하거나 CLI 사용
```

### 4. 이메일 주소 수정

`netlify/functions/send-push.js` 파일에서 이메일 주소를 수정하세요:

```javascript
webpush.setVapidDetails(
  'mailto:your-email@yourdomain.com', // 실제 이메일 주소로 변경
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
```

## 🚀 사용 방법

### 사용자 측면
1. `/notifications` 페이지 방문
2. "푸시 알림 켜기" 버튼 클릭
3. 브라우저 권한 허용
4. 브라우저가 닫혀있어도 알림 수신 가능

### 개발자 측면
```typescript
// 알림 발송 (자동으로 처리됨)
await notificationService.notifyComment(itemId, userId, commentId);
await notificationService.notifyLike(itemId, userId);
await notificationService.notifyFollow(targetUserId, actorUserId);
```

## 💰 비용 분석

| 서비스            | 사용량             | 비용   |
| ----------------- | ------------------ | ------ |
| Web Push API      | 무제한             | **₩0** |
| Netlify Functions | 125,000회/월       | **₩0** |
| Supabase DB       | 500MB + 2GB 대역폭 | **₩0** |
| **총 비용**       |                    | **₩0** |

## 🔍 동작 원리

1. **사용자 구독**: 브라우저에서 푸시 구독 생성 → Supabase에 저장
2. **알림 발생**: 댓글/좋아요 등 → DB 알림 + 푸시 발송 체크
3. **푸시 발송**: Netlify Function → Web Push API → 브라우저
4. **알림 표시**: Service Worker → 브라우저 알림

## 🛠️ 문제 해결

### 푸시 알림이 오지 않을 때
1. 브라우저 알림 권한 확인
2. VAPID 키 설정 확인
3. Netlify Functions 배포 상태 확인
4. Network 탭에서 API 호출 상태 확인

### Service Worker 문제
```javascript
// 브라우저 개발자 도구에서 확인
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

## 📱 지원 브라우저

- ✅ Chrome (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile) 
- ✅ Safari (iOS 16.4+, macOS 13.1+)
- ✅ Edge (Desktop & Mobile)
- ❌ iOS Safari (16.3 이하)

## 🎯 다음 단계

1. [ ] 환경변수 설정
2. [ ] Supabase 테이블 생성  
3. [ ] 테스트 및 검증
4. [ ] 프로덕션 배포

## 💡 팁

- 개발 시에는 localhost에서도 푸시 알림이 작동합니다
- HTTPS가 필수입니다 (Netlify는 자동 HTTPS 제공)
- 사용자가 알림을 거부하면 다시 권한을 요청할 수 없습니다
- 브라우저별로 알림 스타일이 약간 다를 수 있습니다