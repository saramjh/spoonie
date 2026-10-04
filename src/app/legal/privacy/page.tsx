import Link from "next/link"
import { Sheet } from "@/components/kit"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      <div className="px-3 py-4">
        {/* 헤더 */}
        <div className="mb-4 px-1">
          <Link href="/" className="mb-4 inline-flex h-11 items-center text-label text-ink underline underline-offset-4">
            홈으로
          </Link>
          <h1 className="text-title text-ink">개인정보처리방침</h1>
          <p className="text-ink-soft">최종 업데이트: 2026년 10월 5일</p>
        </div>

        {/* 내용 */}
        <Sheet className="px-5 py-6">
          <div className="prose max-w-none">
            
            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">1. 개인정보 수집 및 이용 목적</h2>
              <p className="text-ink leading-relaxed mb-4">
                Spoonie는 다음과 같은 목적으로 개인정보를 수집 및 이용합니다:
              </p>
              <ul className="list-disc pl-6 text-ink space-y-2">
                <li>회원 가입 및 관리, 본인 확인</li>
                <li>레시피 공유 서비스 제공</li>
                <li>커뮤니티 기능 제공 (댓글, 좋아요, 팔로우)</li>
                <li>서비스 개선 및 맞춤형 서비스 제공</li>
                <li>고객 상담 및 불만 처리</li>
                <li>파트너·제휴 문의 접수, 회신 및 후속 협의</li>
                <li>서비스 이용 통계 분석</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">2. 수집하는 개인정보 항목</h2>
              
              <div className="mb-4">
                <h3 className="text-heading text-ink mb-2">필수 수집 항목</h3>
                <ul className="list-disc pl-6 text-ink space-y-1">
                  <li>이메일 주소</li>
                  <li>닉네임</li>
                  <li>프로필 사진 (선택)</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-heading text-ink mb-2">파트너·제휴 문의 시 수집 항목</h3>
                <ul className="list-disc pl-6 text-ink space-y-1">
                  <li>이름 또는 활동명, 답변 받을 이메일</li>
                  <li>소속·채널·브랜드 정보 (입력한 경우)</li>
                  <li>프로필·제품 URL (입력한 경우)</li>
                  <li>문의 내용</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-heading text-ink mb-2">자동 수집 항목</h3>
                <ul className="list-disc pl-6 text-ink space-y-1">
                  <li>IP 주소, 접속 로그</li>
                  <li>기기 정보 (브라우저 종류, OS)</li>
                                  <li>서비스 이용 기록</li>
                <li>쿠키 및 웹 스토리지 정보</li>
                <li>광고 관련 정보 (광고 노출 및 클릭 데이터)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-heading text-ink mb-2">사용자 생성 콘텐츠</h3>
                <ul className="list-disc pl-6 text-ink space-y-1">
                  <li>레시피 내용 및 이미지</li>
                  <li>댓글 및 평가</li>
                  <li>북마크 및 좋아요 정보</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">3. 개인정보 처리 및 보유 기간</h2>
              <ul className="list-disc pl-6 text-ink space-y-2">
                <li><strong>회원 정보:</strong> 회원 탈퇴 시까지</li>
                <li><strong>사용자 생성 콘텐츠:</strong> 콘텐츠 삭제 요청 시까지</li>
                <li><strong>접속 로그:</strong> 1년</li>
                <li><strong>파트너·제휴 문의:</strong> 문의 처리 및 후속 협의 목적 달성 시까지</li>
                <li><strong>법정 보존 의무 정보:</strong> 관련 법령에 따른 보존 기간</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">4. 개인정보 제3자 제공</h2>
              <p className="text-ink leading-relaxed">
                Spoonie는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 
                단, 다음의 경우에는 예외로 합니다:
              </p>
              <ul className="list-disc pl-6 text-ink space-y-2 mt-4">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">5. 개인정보 처리 위탁</h2>
              <p className="text-ink leading-relaxed mb-4">
                Spoonie는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다:
              </p>
              <ul className="list-disc pl-6 text-ink space-y-2">
                <li><strong>Supabase (미국):</strong> 데이터베이스 및 인증 서비스</li>
                <li><strong>Google (미국):</strong> 소셜 로그인 및 광고 서비스</li>
                <li><strong>Netlify (미국):</strong> 웹 호스팅 서비스</li>
                <li><strong>기타:</strong> 서비스 제공에 필요한 제3자 서비스 제공업체</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">6. 이용자의 권리</h2>
              <p className="text-ink leading-relaxed mb-4">
                이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:
              </p>
              <ul className="list-disc pl-6 text-ink space-y-2">
                <li>개인정보 처리 현황 통지 요구</li>
                <li>개인정보 열람 요구</li>
                <li>개인정보 정정·삭제 요구</li>
                <li>개인정보 처리정지 요구</li>
                <li>회원 탈퇴 (계정 삭제)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">7. 개인정보 보호를 위한 기술적·관리적 조치</h2>
              <ul className="list-disc pl-6 text-ink space-y-2">
                <li>개인정보 암호화 저장</li>
                <li>HTTPS 보안 통신</li>
                <li>접근 권한 관리</li>
                <li>개인정보 처리 기록 관리</li>
                <li>정기적인 보안 점검</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-heading text-ink mb-3">8. 개인정보 보호책임자</h2>
              <div className="bg-muted p-4 rounded-[3px]">
                <p className="text-ink">
                  <strong>개인정보 보호책임자:</strong> Spoonie 운영팀<br/>
                  <strong>연락처:</strong> devTestudinidae@gmail.com<br/>
                  <strong>처리 시간:</strong> 가능한 범위 내에서 신속히 처리 (영업일 기준 1주일 이내)
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-heading text-ink mb-3">9. 정책 변경</h2>
              <p className="text-ink leading-relaxed">
                이 개인정보처리방침은 법령·정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는 
                개정 최소 7일 전부터 서비스 내 공지사항을 통해 고지할 것입니다.
              </p>
            </section>

          </div>
        </Sheet>

        {/* 하단 링크 */}
        <div className="text-center mt-8 space-x-4">
          <Link href="/legal/terms" className="text-orange-ink hover:text-orange-ink text-label">
            이용약관
          </Link>
          <span className="text-ink-soft/60">|</span>
          <Link href="/legal/policy" className="text-orange-ink hover:text-orange-ink text-label">
            운영정책
          </Link>
        </div>
      </div>
    </div>
  )
}