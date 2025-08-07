import Link from "next/link"

export default function OperationPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="text-orange-500 hover:text-orange-600 transition-colors">
              ← 홈으로 돌아가기
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">운영정책</h1>
          <p className="text-gray-600">최종 업데이트: 2025년 8월 7일</p>
        </div>

        {/* 내용 */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="prose max-w-none">
            
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">1. 커뮤니티 가이드라인</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Spoonie는 모든 이용자가 안전하고 즐겁게 이용할 수 있는 요리 커뮤니티를 만들기 위해 다음 가이드라인을 운영합니다.
              </p>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🍳 레시피 게시 가이드라인</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>직접 만든 요리나 신뢰할 수 있는 출처의 레시피를 공유해주세요</li>
                  <li>재료와 조리법을 구체적이고 명확하게 작성해주세요</li>
                  <li>본인이 촬영한 음식 사진을 사용해주세요</li>
                  <li>타인의 레시피를 참고한 경우 출처를 명시해주세요</li>
                  <li>위험하거나 건강에 해로운 조리법은 게시하지 마세요</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">💬 소통 가이드라인</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>서로를 존중하고 배려하는 마음으로 소통해주세요</li>
                  <li>건설적인 피드백과 조언을 나눠주세요</li>
                  <li>다른 이용자의 요리 실력이나 선택을 비판하지 마세요</li>
                  <li>질문이나 도움 요청에 친절하게 응답해주세요</li>
                  <li>개인적인 취향의 차이를 인정하고 받아들여주세요</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">2. 광고 서비스 안내</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                서비스 운영 비용 충당을 위해 Google AdSense 등의 광고 서비스를 이용합니다.
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>광고는 서비스 운영 비용에만 사용되며, 영리 목적이 아닙니다</li>
                <li>광고 쿠키 및 데이터 수집에 대한 자세한 내용은 개인정보처리방침을 참고하세요</li>
                <li>광고 차단 기능은 브라우저 설정에서 이용할 수 있습니다</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">3. 금지 행위</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">⚠️ 콘텐츠 관련 금지사항</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>타인의 레시피나 이미지를 무단으로 복사하여 게시하는 행위</li>
                  <li>음식과 관련 없는 콘텐츠 게시</li>
                  <li>외설적이거나 폭력적인 내용 게시</li>
                  <li>허위 정보나 과장된 효능을 주장하는 내용</li>
                  <li>상업적 광고나 스팸성 콘텐츠</li>
                  <li>저작권을 침해하는 콘텐츠</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🚫 행동 관련 금지사항</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>다른 이용자에 대한 인신공격, 욕설, 차별적 발언</li>
                  <li>개인정보 무단 수집 및 공개</li>
                  <li>허위 신고나 악의적 신고</li>
                  <li>시스템 악용이나 해킹 시도</li>
                  <li>중복 계정 생성 및 운영</li>
                  <li>타인 명의 도용</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. 신고 및 제재</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">📢 신고 절차</h3>
                <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                  <li>부적절한 콘텐츠나 행위를 발견하신 경우 신고 기능을 이용해주세요</li>
                  <li>신고 시 구체적인 사유와 증거를 제공해주세요</li>
                  <li>운영팀에서 신고 내용을 검토한 후 조치를 취합니다</li>
                  <li>신고 결과는 신고자에게 개별 안내됩니다</li>
                </ol>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">⚖️ 제재 조치</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  가이드라인 위반 시 다음과 같은 제재 조치가 적용될 수 있습니다:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li><strong>1차 위반:</strong> 경고 및 콘텐츠 삭제</li>
                  <li><strong>2차 위반:</strong> 3일~7일 일시 정지</li>
                  <li><strong>3차 위반:</strong> 30일 일시 정지</li>
                  <li><strong>중대한 위반:</strong> 영구 정지</li>
                </ul>
                <p className="text-gray-600 text-sm mt-4">
                  * 위반의 정도와 성격에 따라 단계를 건너뛰어 조치될 수 있습니다.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">5. 지적재산권 보호</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">📝 저작권 정책</h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-2">
                  <li>본인이 저작권을 가진 콘텐츠만 게시해주세요</li>
                  <li>타인의 레시피를 참고한 경우 반드시 출처를 명시해주세요</li>
                  <li>타인의 이미지를 사용할 때는 사전 허가를 받아주세요</li>
                  <li>저작권 침해 신고를 받은 경우 즉시 해당 콘텐츠를 검토합니다</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🛡️ DMCA 정책</h3>
                <p className="text-gray-700 leading-relaxed">
                  저작권 침해를 발견하신 경우 devTestudinidae@gmail.com으로 다음 정보와 함께 신고해주세요:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-2">
                  <li>침해 받은 저작물에 대한 설명</li>
                  <li>침해가 의심되는 콘텐츠의 URL</li>
                  <li>신고자의 연락처 정보</li>
                  <li>저작권자임을 증명하는 자료</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">6. 개인정보 보호</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>다른 이용자의 개인정보를 무단으로 수집하거나 공개하지 마세요</li>
                <li>실명, 전화번호, 주소 등 개인정보 공개를 요구하거나 강요하지 마세요</li>
                <li>프로필 이미지에 타인의 사진을 무단 사용하지 마세요</li>
                <li>개인정보 보호에 관한 자세한 내용은 개인정보처리방침을 참고해주세요</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">7. 건강 및 안전</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>알레르기 유발 가능 식재료는 반드시 명시해주세요</li>
                <li>위험한 조리법이나 식재료 사용법은 게시하지 마세요</li>
                <li>의학적 효능이나 치료 효과를 과장하여 표현하지 마세요</li>
                <li>임산부, 어린이 등 특정 대상에게 주의가 필요한 경우 안내해주세요</li>
                <li>식중독 위험이 있는 조리법은 충분한 주의사항과 함께 안내해주세요</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">8. 이의제기 및 문의</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                제재 조치에 대해 이의가 있거나 기타 문의사항이 있으신 경우:
              </p>
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-gray-700">
                  <strong>연락처:</strong> devTestudinidae@gmail.com<br/>
                  <strong>처리 시간:</strong> 가능한 범위 내에서 신속히 처리 (일반적으로 1주일 이내)<br/>
                  <strong>이의제기 기간:</strong> 제재 조치 통보일로부터 30일 이내<br/>
                  <strong>주의사항:</strong> 개인 운영 서비스로 응답이 지연될 수 있습니다
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">9. 운영 유연성</h2>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-6">
                <p className="text-gray-700 leading-relaxed">
                  <strong>📝 운영 방침:</strong> 본 서비스는 개인이 취미로 운영하는 커뮤니티 서비스입니다.
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mt-3">
                  <li>운영자의 개인 사정(학업, 직업, 건강 등)으로 인해 서비스 응답이 지연될 수 있습니다</li>
                  <li>긴급한 사안이 아닌 경우 빠른 응답을 기대하지 마세요</li>
                  <li>상업적 서비스 수준의 신속한 고객 지원을 보장하지 않습니다</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">10. 정책 개정</h2>
              <p className="text-gray-700 leading-relaxed">
                이 운영정책은 서비스 개선 및 법령 변경 등에 따라 수정될 수 있습니다. 
                개정된 정책은 서비스 내 공지를 통해 최소 7일 전에 안내되며, 
                중대한 변경사항의 경우 개별 통지할 수 있습니다.
              </p>
            </section>

          </div>
        </div>

        {/* 하단 링크 */}
        <div className="text-center mt-8 space-x-4">
          <Link href="/legal/privacy" className="text-orange-500 hover:text-orange-600 text-sm">
            개인정보처리방침
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/legal/terms" className="text-orange-500 hover:text-orange-600 text-sm">
            이용약관
          </Link>
        </div>
      </div>
    </div>
  )
}