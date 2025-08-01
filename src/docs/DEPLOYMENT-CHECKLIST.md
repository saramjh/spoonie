# ✅ Netlify 배포 체크리스트

## 🚀 **배포 준비 완료 상태**

### **✅ 파일 구성**
- 📄 `netlify.toml` - Netlify 배포 설정
- 📄 `.netlifyignore` - 빌드 최적화 제외 파일
- 📄 `netlify-deployment-guide.md` - 상세 배포 가이드
- 📦 `package.json` - Netlify 스크립트 추가

### **✅ 기술 스택 검증**
- 🎯 **Next.js 14** + App Router - Netlify 완전 지원
- 🗄️ **Supabase** - SSR 설정 완료
- 📊 **Google Analytics** - 프로덕션 환경 대응
- 💰 **Google AdSense** - 토스 스타일 구현
- 📱 **PWA** - 오프라인 지원
- 🎨 **SEO 메타데이터** - 동적 생성 완료

---

## 🔧 **즉시 배포 가능 상태**

### **Step 1: GitHub 저장소 준비** ✅
```bash
git add .
git commit -m "🚀 Netlify 배포 준비 완료"
git push origin main
```

### **Step 2: Netlify 사이트 생성**
1. [Netlify 대시보드](https://app.netlify.com) 접속
2. **"New site from Git"** 클릭
3. **GitHub 연결** → Spoonie 저장소 선택
4. **빌드 설정** (자동 감지):
   ```
   Build command: npm run build
   Publish directory: .next
   ```

### **Step 3: 환경변수 설정** ⚠️ **중요**
**Site settings → Environment variables**에서 다음 변수들 추가:

```bash
# 🗄️ Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://dtyiyzfftsewpckfkqmo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Supabase 대시보드에서 복사]

# 📊 Google Analytics (이미 설정된 ID)
NEXT_PUBLIC_GA_ID=G-16DKDXVQ9T

# 💰 Google AdSense (이미 설정된 ID)  
NEXT_PUBLIC_ADSENSE_ID=ca-pub-4410729598083068

# 🌐 앱 URL (배포 후 업데이트)
NEXT_PUBLIC_APP_URL=https://[your-site-name].netlify.app

# 🔧 Node 환경
NODE_ENV=production
```

### **Step 4: Supabase 설정 업데이트**
[Supabase 대시보드](https://supabase.com/dashboard) → Authentication → URL Configuration:
```bash
Site URL: https://[your-site-name].netlify.app
Redirect URLs: https://[your-site-name].netlify.app/auth/callback
```

---

## 🎯 **배포 후 즉시 확인사항**

### **✅ 기본 기능 테스트**
- [ ] 홈페이지 로딩
- [ ] 레시피 상세페이지 (동적 메타데이터)
- [ ] 프로필 페이지
- [ ] 검색 기능
- [ ] 로그인/회원가입

### **✅ SEO 메타데이터 확인**
브라우저 개발자 도구에서:
- [ ] `<title>` 태그 동적 생성 확인
- [ ] `<meta name="description">` 확인
- [ ] Open Graph 태그들 확인

외부 도구 검증:
- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### **✅ 서비스 연동 확인**
- [ ] Google Analytics 데이터 수집 (실시간 확인)
- [ ] AdSense 광고 정상 표시
- [ ] Supabase 데이터 로딩
- [ ] PWA 설치 기능

### **✅ 성능 확인**
- [ ] [Lighthouse](https://pagespeed.web.dev/) 점수 90+ 확인
- [ ] 모바일 반응형 확인
- [ ] 이미지 로딩 속도 확인

---

## 🚨 **문제 해결 가이드**

### **빌드 실패 시**
```bash
# 로컬에서 빌드 테스트
npm run build

# 에러 로그 확인 후 수정
# 주로 환경변수 누락이 원인
```

### **Supabase 연결 실패 시**
```bash
# Supabase 대시보드에서 확인:
1. Site URL이 Netlify URL과 일치하는지
2. Redirect URLs에 /auth/callback이 있는지
3. 환경변수가 정확한지
```

### **메타데이터 생성 실패 시**
```bash
# 서버 컴포넌트 에러:
1. Supabase 연결 확인
2. 쿼리 타임아웃 확인
3. try-catch 에러 핸들링 확인
```

---

## 🎉 **배포 성공 확인**

배포가 성공하면 다음을 확인할 수 있습니다:

### **🌐 사용자 접근**
- ✅ https://[your-site-name].netlify.app 접속 가능
- ✅ 모든 페이지 정상 로딩
- ✅ 모바일에서 PWA 설치 가능

### **📊 Analytics 데이터**
- ✅ Google Analytics에서 실시간 사용자 확인
- ✅ 페이지뷰 추적 정상 작동
- ✅ 커스텀 이벤트 수집 확인

### **💰 AdSense 수익화**
- ✅ 광고 정상 표시
- ✅ 토스 스타일 디자인 유지
- ✅ 모바일 반응형 광고

### **🎯 SEO 최적화**
- ✅ 구글 검색에서 개별 레시피 검색 가능
- ✅ 소셜 공유 시 예쁜 카드 표시
- ✅ 메타데이터 동적 생성 확인

---

## 🔗 **다음 단계**

배포 완료 후 추가로 할 수 있는 작업들:

### **🌐 커스텀 도메인** (선택사항)
```bash
1. 도메인 구매 (예: spoonie.co.kr)
2. Netlify에서 도메인 연결
3. 환경변수 NEXT_PUBLIC_APP_URL 업데이트
4. Supabase URL 설정 업데이트
```

### **📈 성능 모니터링**
```bash
1. Netlify Analytics 활성화
2. Google Search Console 등록
3. Core Web Vitals 모니터링
4. 사용자 피드백 수집
```

### **🚀 지속적 배포**
```bash
1. GitHub Actions 설정 (선택사항)
2. 브랜치별 배포 환경 구성
3. 자동 테스트 추가
```

---

## 🎯 **최종 상태**

> **"Netlify 배포 준비가 100% 완료되었습니다!"**

**지금 바로 배포하셔도 됩니다:**
- ✅ Next.js App Router 완전 지원
- ✅ 동적 메타데이터 SEO 최적화  
- ✅ Supabase SSR 완벽 구현
- ✅ Google Analytics & AdSense 연동
- ✅ PWA 기능 모바일 최적화
- ✅ 토스 UX/UI 디자인 완성

**🚀 Deploy to Netlify 버튼만 누르면 완료!**