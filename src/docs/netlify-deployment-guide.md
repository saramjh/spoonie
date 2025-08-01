# 🚀 Spoonie Netlify 배포 가이드

## 📋 목차
1. [배포 전 준비사항](#배포-전-준비사항)
2. [Netlify 설정](#netlify-설정)
3. [환경변수 설정](#환경변수-설정)
4. [배포 과정](#배포-과정)
5. [배포 후 확인사항](#배포-후-확인사항)
6. [문제 해결](#문제-해결)

---

## 🔧 배포 전 준비사항

### 1. **Git 저장소 준비**
```bash
# 모든 변경사항 커밋
git add .
git commit -m "🚀 Netlify 배포 준비"
git push origin main
```

### 2. **빌드 테스트**
```bash
# 로컬에서 프로덕션 빌드 테스트
npm run build
npm run start

# 빌드 성공 확인 후 진행
```

### 3. **환경변수 점검**
현재 필요한 환경변수들:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Google Services  
NEXT_PUBLIC_GA_ID=G-16DKDXVQ9T
NEXT_PUBLIC_ADSENSE_ID=ca-pub-4410729598083068

# App
NEXT_PUBLIC_APP_URL=https://spoonie-web.netlify.app
```

---

## 🌐 Netlify 설정

### **Step 1: Netlify 사이트 생성**

1. **Netlify 대시보드** 접속 → `New site from Git`
2. **GitHub 연결** → Spoonie 저장소 선택
3. **빌드 설정**:
   ```
   Build command: npm run build
   Publish directory: .next
   ```

### **Step 2: Next.js 플러그인 자동 감지**
Netlify가 Next.js 프로젝트를 자동으로 감지하고 `@netlify/plugin-nextjs` 플러그인을 적용합니다.

---

## 🔑 환경변수 설정

### **Netlify 대시보드에서 설정**

**Site settings → Environment variables → Add variable**

```bash
# 🗄️ Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# 📊 Google Analytics
NEXT_PUBLIC_GA_ID=G-16DKDXVQ9T

# 💰 Google AdSense  
NEXT_PUBLIC_ADSENSE_ID=ca-pub-4410729598083068

# 🌐 앱 URL (배포 후 업데이트)
NEXT_PUBLIC_APP_URL=https://spoonie-web.netlify.app

# 🔧 Node 환경
NODE_ENV=production
```

### **⚠️ 중요: Supabase 설정**
```bash
# Supabase 대시보드에서:
# 1. Settings → API → URL & Keys 확인
# 2. Authentication → URL Configuration에 Netlify URL 추가:
#    - Site URL: https://spoonie-web.netlify.app  
#    - Redirect URLs: https://spoonie-web.netlify.app/auth/callback
```

---

## 🚀 배포 과정

### **자동 배포 설정**
```bash
1. Git push → 자동 배포 트리거
2. 빌드 로그 실시간 모니터링  
3. 배포 완료 후 URL 확인
```

### **수동 배포 (필요시)**
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login

# 수동 배포
netlify deploy --prod --dir=.next
```

---

## ✅ 배포 후 확인사항

### **1. 기본 기능 테스트**
```bash
✅ 홈페이지 로딩
✅ 레시피 상세페이지 (동적 메타데이터 확인)
✅ 프로필 페이지
✅ 검색 기능
✅ 로그인/회원가입
```

### **2. SEO 메타데이터 확인**
```bash
# 개발자 도구에서 확인:
✅ <title> 태그 동적 생성
✅ <meta name="description"> 
✅ Open Graph 태그들
✅ Twitter Cards

# 외부 도구로 확인:
✅ Facebook Sharing Debugger
✅ Twitter Card Validator  
✅ Google Rich Results Test
```

### **3. Analytics & AdSense 확인**
```bash
✅ Google Analytics 데이터 수집
✅ AdSense 광고 정상 표시
✅ PWA 기능 (오프라인 페이지)
✅ 이미지 로딩 (Supabase Storage)
```

### **4. 성능 테스트**
```bash
✅ Lighthouse 점수 (90+ 목표)
✅ Core Web Vitals
✅ 모바일 반응형
✅ PWA 설치 기능
```

---

## 🔧 문제 해결

### **자주 발생하는 이슈들**

#### **1. 빌드 실패**
```bash
# 에러: Module not found
해결: package.json의 dependencies 확인

# 에러: Environment variable 
해결: 모든 NEXT_PUBLIC_ 변수가 Netlify에 설정되었는지 확인
```

#### **2. Supabase 연결 실패**
```bash
# CORS 에러
해결: Supabase 대시보드에서 Site URL 추가

# 인증 실패  
해결: Redirect URLs에 /auth/callback 경로 추가
```

#### **3. 이미지 로딩 실패**
```bash
# Next.js Image 최적화 에러
해결: next.config.mjs에서 unoptimized: true 확인

# Supabase Storage 404
해결: 이미지 URL 형식과 권한 확인
```

#### **4. 메타데이터 생성 실패**
```bash
# generateMetadata 함수 에러
해결: 서버 컴포넌트에서 try-catch로 에러 핸들링 확인

# Database 연결 타임아웃
해결: Supabase 연결 설정 및 쿼리 최적화
```

---

## 🎯 성능 최적화 팁

### **1. 빌드 시간 단축**
```bash
# .netlifyignore 파일 생성
node_modules
.git
*.log
.env*
```

### **2. 캐싱 최적화**
```bash
# netlify.toml에서 캐시 헤더 설정 (이미 적용됨)
# 정적 파일들: 1년 캐싱
# 동적 콘텐츠: 적절한 캐시 정책
```

### **3. 번들 크기 최적화**
```bash
# 불필요한 패키지 제거
npm run build -- --analyze  # 번들 분석

# 동적 import 사용
const HeavyComponent = lazy(() => import('./HeavyComponent'))
```

---

## 🎉 배포 완료 체크리스트

```bash
✅ Git 저장소 연결 완료
✅ 환경변수 모두 설정 완료  
✅ Supabase URL 설정 완료
✅ 도메인 설정 (선택사항)
✅ HTTPS 인증서 자동 설정
✅ 기본 기능 테스트 완료
✅ SEO 메타데이터 확인 완료
✅ Analytics 연동 확인
✅ AdSense 광고 표시 확인
✅ PWA 기능 테스트 완료
✅ 모바일 반응형 확인
✅ 성능 점수 확인 (Lighthouse 90+)
```

---

## 🔗 유용한 링크

- **Netlify Docs**: https://docs.netlify.com/
- **Next.js on Netlify**: https://docs.netlify.com/frameworks/next-js/
- **Supabase Auth Helpers**: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- **Google Analytics Setup**: https://developers.google.com/analytics/devguides/collection/gtagjs

---

**🚀 준비되셨으면 "Deploy to Netlify" 버튼을 눌러보세요!**
