# 🎯 Analytics & AdSense 설정 가이드

## 📋 환경변수 설정

### `.env.local` 파일에 추가:
```bash
# 🎯 Google Analytics (제공받은 ID)
NEXT_PUBLIC_GA_ID=G-16DKDXVQ9T

# 💰 Google AdSense (제공받은 퍼블리셔 ID)  
NEXT_PUBLIC_ADSENSE_ID=ca-pub-4410729598083068

# 📱 사이트 기본 URL
NEXT_PUBLIC_APP_URL=https://spoonie.kr
```

---

## 🎯 Google Analytics 추가 설정

### 1. **사용자 정의 이벤트 추가**
```typescript
// 레시피 조회수 추적
TossAnalyticsEvents.viewRecipe(recipeId, recipeTitle)

// 검색어 추적  
TossAnalyticsEvents.searchQuery(searchTerm)

// 팔로우 추적
TossAnalyticsEvents.followUser(userId)
```

### 2. **목표 설정 (GA4 대시보드)**
- 레시피 조회 → 전환 이벤트로 설정
- 회원가입 → 전환 이벤트로 설정  
- 광고 클릭 → 수익 추적용 이벤트

---

## 💰 Google AdSense 광고 단위 생성

### 1. **권장 광고 단위**

| 위치            | 크기    | 슬롯 ID 예시 |
| --------------- | ------- | ------------ |
| 피드 중간       | 320x250 | `9876543210` |
| 상세페이지 중간 | 336x280 | `1234567890` |
| 검색 결과 상단  | 728x90  | `5555555555` |

### 2. **반응형 광고 설정**
```typescript
// 모바일 최적화
data-ad-format="rectangle"
data-full-width-responsive="true"
```

---

## 📊 성과 측정 KPI

### 🎯 Analytics 주요 지표
- **페이지뷰**: 일일/주간 추이
- **사용자 체류시간**: 레시피 상세페이지 기준
- **바운스율**: 50% 이하 목표
- **사용자 경로**: 홈→검색→상세→댓글 플로우

### 💰 AdSense 주요 지표  
- **CTR (클릭률)**: 2-5% 목표
- **CPC (클릭당 단가)**: 요리 키워드 기준
- **RPM (1000회 노출당 수익)**: 업계 평균 $1-3
- **광고 로딩 속도**: 3초 이내

---

## ⚡ 성능 최적화 체크리스트

### ✅ Analytics 최적화
- [ ] 개발환경에서 Analytics 비활성화
- [ ] 페이지뷰 자동 추적 구현
- [ ] 커스텀 이벤트 정의 완료
- [ ] 목표 전환 설정 완료

### ✅ AdSense 최적화  
- [ ] 지연 로딩 구현 (Intersection Observer)
- [ ] CLS 방지 (고정 높이 설정)
- [ ] 광고 클릭 추적 구현
- [ ] A/B 테스트 준비 (광고 위치별)

### ✅ 사용자 경험
- [ ] 광고 라벨 명시 ("광고")
- [ ] 모바일 터치 친화적 크기
- [ ] 브랜드 일관성 유지 (오렌지 컬러)
- [ ] 3:1 콘텐츠-광고 비율 준수

---

## 🚀 배포 전 최종 점검

1. **GA4 실시간 보고서**에서 데이터 수집 확인
2. **AdSense 정책 준수** 확인 (콘텐츠 가이드라인)
3. **Core Web Vitals** 점수 확인 (LCP, CLS, INP)
4. **모바일 친화성** 테스트 완료