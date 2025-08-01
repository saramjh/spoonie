# 💰 무료 플랜 배포 가이드

## 🎯 개요

Spoonie 앱을 **Netlify + Supabase 무료 플랜**으로 배포하기 위한 최적화된 설정 가이드입니다.

---

## 🏆 최적화된 알림 시스템

### **💡 핵심 전략**
- ❌ **실시간 WebSocket** 사용 안함 (연결 제한 절약)
- ✅ **폴링 기반** 알림 시스템 (3분 주기)
- ✅ **토스 스타일 UX** 유지 (스와이프 삭제, 배치 처리)
- ✅ **브라우저 캐싱** 적극 활용

### **📱 사용자 경험**
```
일반 사용자 관점:
- 알림 확인: 30초 내 업데이트 (충분히 빠름)
- 스와이프 삭제: 즉시 반응 (5초 되돌리기)
- 배치 처리: 여러 알림 한번에 정리
- 오프라인 지원: 캐시된 데이터로 안정적 동작
```

---

## 🔧 Supabase 무료 플랜 설정

### **1. 데이터베이스 최적화**

#### RLS 정책 (필수)
```sql
-- 알림 테이블 RLS 정책
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
```

#### 인덱스 최적화
```sql
-- 알림 조회 성능 최적화
CREATE INDEX idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_unread 
ON notifications(user_id, is_read) 
WHERE is_read = false;
```

### **2. API 제한 관리**

#### 요청 제한
- **분당**: 최대 60회
- **시간당**: 최대 3,600회
- **일일**: 최대 50,000회

#### 최적화 전략
```typescript
// API 호출 추적 및 제한
export function isWithinApiLimits(): boolean {
  const minuteCalls = getApiCallsThisMinute()
  const hourCalls = getApiCallsThisHour()
  
  return minuteCalls < 60 && hourCalls < 3600
}
```

---

## 🚀 Netlify 무료 플랜 설정

### **1. 빌드 최적화**

#### next.config.mjs
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 💰 무료 플랜 최적화
  output: 'export',
  trailingSlash: true,
  
  // 이미지 최적화 (Netlify 무료에서 지원)
  images: {
    unoptimized: true // 또는 Netlify Image CDN 사용
  },
  
  // 번들 크기 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}

export default nextConfig
```

#### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "18"

# 💰 무료 플랜 최적화: 캐싱 설정
[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/images/*"
  [headers.values]
    Cache-Control = "public, max-age=86400"

# SPA 라우팅
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### **2. 대역폭 최적화**

#### 이미지 압축
```bash
# 빌드 전 이미지 최적화
npm install -g imagemin-cli
imagemin public/images/* --out-dir=public/images --plugin=imagemin-webp
```

#### 코드 분할
```typescript
// 동적 import로 번들 크기 최적화
const TossNotificationList = dynamic(
  () => import('@/components/notifications/TossStyleNotificationList'),
  { ssr: false }
)
```

---

## 📊 성능 모니터링

### **1. 무료 플랜 사용량 체크**

#### Supabase 대시보드
- **Database**: 500MB 제한
- **Auth**: 50,000 MAU
- **Storage**: 1GB
- **Edge Functions**: 500,000 호출/월

#### Netlify 대시보드
- **Build Minutes**: 300분/월
- **Bandwidth**: 100GB/월
- **Sites**: 100개

### **2. 클라이언트 모니터링**

```typescript
// 사용량 모니터링 훅
export function useUsageMonitoring() {
  useEffect(() => {
    // API 호출 통계
    const apiCalls = getApiCallsToday()
    if (apiCalls > 40000) { // 일일 한도의 80%
      console.warn('🚨 API 사용량 경고')
    }
    
    // 로컬 스토리지 사용량
    const storageUsed = getStorageUsage()
    if (storageUsed > 4 * 1024 * 1024) { // 4MB
      cleanupOldCache()
    }
  }, [])
}
```

---

## 🔄 배포 워크플로우

### **1. 개발 → 스테이징 → 프로덕션**

```bash
# 1. 개발 환경 테스트
npm run dev

# 2. 프로덕션 빌드 테스트
npm run build
npm run start

# 3. Netlify 배포
git push origin main  # 자동 배포
```

### **2. 환경변수 설정**

#### .env.local
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 무료 플랜 최적화 설정
NEXT_PUBLIC_POLLING_INTERVAL=180000  # 3분
NEXT_PUBLIC_ENABLE_REALTIME=false
NEXT_PUBLIC_BATCH_SIZE=5
```

#### Netlify 환경변수
- Netlify 대시보드 → Site settings → Environment variables
- 위 환경변수들을 동일하게 설정

---

## ⚡ 성능 최적화 체크리스트

### **🎯 무료 플랜 필수 최적화**

- ✅ **폴링 간격**: 3분 (실시간성 vs 비용 균형)
- ✅ **배치 처리**: 5개씩 2초 간격 삭제
- ✅ **브라우저 캐싱**: 5분 TTL로 API 절약
- ✅ **API 제한 체크**: 요청 전 사용량 확인
- ✅ **에러 처리**: 제한 도달 시 우아한 degradation
- ✅ **오프라인 지원**: 캐시 기반 동작
- ✅ **이미지 최적화**: WebP 포맷 + 압축
- ✅ **코드 분할**: 동적 import 활용

### **📱 사용자 경험 보장**

- ✅ **즉시 피드백**: 옵티미스틱 업데이트
- ✅ **토스 스타일 UX**: 스와이프, 애니메이션 유지
- ✅ **에러 복구**: 네트워크 실패 시 재시도
- ✅ **로딩 상태**: 명확한 사용자 피드백

---

## 🚨 주의사항

### **1. 무료 플랜 제한**

- **Supabase**: 실시간 연결 200개 제한 → 폴링 사용
- **Netlify**: 월 300분 빌드 제한 → 효율적 빌드
- **대역폭**: 100GB/월 → 이미지 최적화 필수

### **2. 스케일링 계획**

```
Phase 1: 무료 플랜 (MVP)
├── 사용자: ~1,000명
├── 알림: 폴링 기반
└── 기능: 기본 CRUD

Phase 2: 유료 전환 (성장)
├── 사용자: 1,000+ 명
├── 알림: 실시간 + 폴링 하이브리드
└── 기능: 고급 알림, 푸시

Phase 3: 본격 스케일 (수익화)
├── 사용자: 10,000+ 명
├── 알림: 완전 실시간
└── 기능: 개인화, 분석
```

---

## 🎉 배포 완료 후 확인사항

### **✅ 배포 성공 체크리스트**

1. **알림 시스템**: 3분 내 알림 업데이트 확인
2. **스와이프 삭제**: 모바일에서 정상 동작
3. **배치 처리**: 여러 알림 선택 삭제 가능
4. **캐싱**: 새로고침 시 빠른 로딩
5. **오프라인**: 네트워크 끊어도 기본 동작
6. **성능**: Lighthouse 점수 90+ 유지

### **📊 모니터링 대시보드**

- Netlify: 빌드 상태, 대역폭 사용량
- Supabase: API 호출, DB 크기, 동시 연결
- 브라우저: 콘솔 에러, 네트워크 실패

**🎯 이제 완전히 무료 플랜에 최적화된 토스 스타일 알림 시스템으로 배포 준비 완료!** 🚀✨