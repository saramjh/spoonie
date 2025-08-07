import Link from "next/link"

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
          <p className="text-gray-600">최종 업데이트: 2025년 8월 7일</p>
        </div>

        {/* 내용 */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="prose max-w-none">
            
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed">
                이 약관은 Spoonie(이하 "서비스")가 제공하는 레시피 공유 및 커뮤니티 서비스의 이용과 관련하여 
                서비스와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제2조 (정의)</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>"서비스"</strong>라 함은 Spoonie가 제공하는 레시피 공유 플랫폼을 의미합니다.</li>
                <li><strong>"이용자"</strong>라 함은 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.</li>
                <li><strong>"회원"</strong>이라 함은 서비스에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며, 서비스를 계속적으로 이용할 수 있는 자를 의미합니다.</li>
                <li><strong>"콘텐츠"</strong>라 함은 이용자가 서비스 내에 게시한 레시피, 이미지, 댓글, 평가 등 모든 정보를 의미합니다.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제3조 (약관의 효력 및 변경)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>이 약관은 서비스를 이용하는 모든 이용자에게 그 효력이 발생합니다.</li>
                <li>서비스는 필요에 따라 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 공지한 후 효력이 발생합니다.</li>
                <li>이용자가 변경된 약관에 동의하지 않는 경우, 서비스 이용을 중단하고 회원탈퇴를 할 수 있습니다.</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제4조 (회원가입)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>회원가입은 이용자가 약관의 내용에 대하여 동의를 하고 회원가입신청을 한 후 서비스가 이러한 신청에 대하여 승낙함으로써 체결됩니다.</li>
                <li>서비스는 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                    <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
                    <li>허위의 정보를 기재하거나, 기재하지 않은 경우</li>
                    <li>기타 회원으로 등록하는 것이 서비스의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제5조 (서비스의 제공 및 변경)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>서비스는 다음과 같은 업무를 수행합니다:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>레시피 등록, 검색, 공유 서비스</li>
                    <li>커뮤니티 서비스 (댓글, 좋아요, 팔로우)</li>
                    <li>개인화된 레시피 추천 서비스</li>
                    <li>광고 서비스 (서비스 운영 비용 충당)</li>
                    <li>기타 서비스가 정하는 업무</li>
                  </ul>
                </li>
                <li>서비스는 운영상, 기술상의 필요에 따라 제공하고 있는 전부 또는 일부 서비스를 변경할 수 있습니다.</li>
                <li>서비스의 내용, 이용방법, 이용시간에 대하여 변경이 있는 경우에는 변경사유, 변경될 서비스의 내용 및 제공일자 등은 그 변경 전에 해당 서비스 초기화면에 게시하여야 합니다.</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제6조 (서비스의 중단)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>서비스는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절, 운영상의 필요, 개인적 사정 등 어떠한 사유로도 사전 통지 없이 서비스를 일시 중단하거나 종료할 수 있습니다.</li>
                <li>서비스는 제1항의 사유로 서비스의 제공이 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 배상하지 않습니다.</li>
                <li>운영자의 개인적 사정(학업, 취업, 건강, 가족 등)이나 기술적 한계로 인한 서비스 중단 또는 성능 저하에 대해서는 책임을 지지 않습니다.</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제7조 (회원의 의무)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>이용자는 다음 행위를 하여서는 안 됩니다:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>신청 또는 변경시 허위 내용의 등록</li>
                    <li>타인의 정보 도용</li>
                    <li>서비스에 게시된 정보의 변경</li>
                    <li>서비스가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                    <li>서비스 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                    <li>서비스 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                    <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                    <li>스팸, 광고성 콘텐츠의 무분별한 게시</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제8조 (게시물의 저작권)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>이용자가 서비스 내에 게시한 글, 사진, 동영상 등의 저작권은 해당 이용자에게 귀속됩니다.</li>
                <li>이용자는 서비스에 게시물을 게시함으로써 해당 게시물을 서비스가 서비스 제공 목적으로 사용하는 것에 동의합니다.</li>
                <li>서비스는 이용자의 게시물을 다음 목적으로 사용할 수 있습니다:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>서비스 내에서의 표시, 전송, 배포</li>
                    <li>서비스 개선 및 새로운 서비스 개발을 위한 사용</li>
                    <li>서비스 홍보를 위한 활용 (사전 동의 시)</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제9조 (계약해지 및 이용제한)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>이용자는 언제든지 서비스 내 설정메뉴를 통하여 이용계약 해지 신청을 할 수 있으며, 서비스는 즉시 처리하겠습니다.</li>
                <li>서비스는 이용자가 이 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계별로 제한할 수 있습니다.</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제10조 (손해배상)</h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  서비스는 무료로 제공되는 서비스와 관련하여 회원에게 어떠한 손해가 발생하더라도 동 손해가 서비스의 고의 또는 중대한 과실에 의한 경우를 제외하고 이에 대하여 책임을 부담하지 아니합니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  서비스와 관련된 손해배상 책임은 어떠한 경우에도 직접손해 100만원, 간접손해 50만원을 초과하지 않습니다.
                </p>
                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                  <p className="text-sm text-gray-700">
                    <strong>⚠️ 중요:</strong> 본 서비스는 개인이 비영리 목적으로 운영하는 커뮤니티 서비스로, 상업적 서비스 수준의 가용성이나 성능을 보장하지 않습니다.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">제11조 (면책조항)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                <li>서비스는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</li>
                <li>서비스는 이용자가 서비스에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">제12조 (준거법 및 관할법원)</h2>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>서비스와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 합니다.</li>
                <li>서비스와 이용자 간에 발생한 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우 거소를 관할하는 지방법원의 전속관할로 합니다.</li>
              </ol>
            </section>

          </div>
        </div>

        {/* 하단 링크 */}
        <div className="text-center mt-8 space-x-4">
          <Link href="/legal/privacy" className="text-orange-500 hover:text-orange-600 text-sm">
            개인정보처리방침
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/legal/policy" className="text-orange-500 hover:text-orange-600 text-sm">
            운영정책
          </Link>
        </div>
      </div>
    </div>
  )
}