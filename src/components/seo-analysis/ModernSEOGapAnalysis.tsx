/**
 * 🔍 2025 SEO 트렌드 vs Spoonie 현재 상태 GAP 분석
 * 최신 웹 검색 결과 기반
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Clock } from "lucide-react"

interface SEOTrend {
  trend: string
  importance: 'critical' | 'high' | 'medium'
  currentStatus: 'excellent' | 'good' | 'poor' | 'missing'
  gapLevel: 'none' | 'minor' | 'major' | 'critical'
  description: string
  recommendedActions: string[]
}

const seoTrends: SEOTrend[] = [
  // ✅ 잘하고 있는 부분들
  {
    trend: "AI 검색 최적화 (FAQ Schema, E-E-A-T)",
    importance: 'critical',
    currentStatus: 'excellent',
    gapLevel: 'none',
    description: "AI 검색을 위한 구조화 데이터와 전문성 신호 완벽 구현",
    recommendedActions: ["✅ 이미 완료됨"]
  },
  {
    trend: "Core Web Vitals & 기술적 SEO",
    importance: 'critical', 
    currentStatus: 'excellent',
    gapLevel: 'none',
    description: "페이지 속도, 모바일 최적화, HTTPS, 사이트맵 완벽",
    recommendedActions: ["✅ 지속 모니터링"]
  },
  {
    trend: "Schema.org 구조화 데이터",
    importance: 'high',
    currentStatus: 'excellent', 
    gapLevel: 'none',
    description: "Recipe, Article, FAQ 스키마 완벽 구현",
    recommendedActions: ["✅ 이미 완료됨"]
  },

  // ⚠️ 개선이 필요한 부분들
  {
    trend: "의미론적 SEO (Semantic SEO)",
    importance: 'critical',
    currentStatus: 'poor',
    gapLevel: 'major',
    description: "엔티티 기반 콘텐츠와 토픽 클러스터 부족",
    recommendedActions: [
      "🔧 엔티티 중심 키워드 리서치",
      "🔧 토픽 클러스터 구축", 
      "🔧 관련 엔티티 연결"
    ]
  },
  {
    trend: "음성 검색 & 대화형 검색",
    importance: 'high',
    currentStatus: 'poor',
    gapLevel: 'major', 
    description: "자연어 질문과 긴 꼬리 키워드 최적화 부족",
    recommendedActions: [
      "🔧 '어떻게', '왜', '무엇을' 형태 질문 추가",
      "🔧 대화형 콘텐츠 작성",
      "🔧 Featured Snippets 최적화"
    ]
  },
  {
    trend: "비디오 SEO & 시각적 검색",
    importance: 'high',
    currentStatus: 'missing',
    gapLevel: 'critical',
    description: "비디오 콘텐츠와 시각적 검색 최적화 전무",
    recommendedActions: [
      "🚨 요리 과정 비디오 제작",
      "🚨 YouTube 채널 개설",
      "🚨 이미지 Alt Text AI 최적화"
    ]
  },
  {
    trend: "제로 클릭 검색 대응",
    importance: 'high',
    currentStatus: 'good',
    gapLevel: 'minor',
    description: "Featured Snippets는 있지만 최적화 부족",
    recommendedActions: [
      "🔧 간결한 답변 구조 개선",
      "🔧 리스트 형태 콘텐츠 추가"
    ]
  },

  // ❌ 심각하게 부족한 부분들
  {
    trend: "멀티모달 콘텐츠",
    importance: 'high',
    currentStatus: 'missing',
    gapLevel: 'critical',
    description: "텍스트, 이미지, 비디오 통합 콘텐츠 없음",
    recommendedActions: [
      "🚨 요리 과정 동영상 추가",
      "🚨 인터랙티브 레시피 카드",
      "🚨 오디오 설명 추가"
    ]
  },
  {
    trend: "개인화 & 지역화 SEO",
    importance: 'medium',
    currentStatus: 'missing', 
    gapLevel: 'major',
    description: "사용자별/지역별 개인화된 콘텐츠 부족",
    recommendedActions: [
      "🔧 지역별 레시피 추천",
      "🔧 사용자 선호도 기반 콘텐츠",
      "🔧 계절별 레시피 제안"
    ]
  },
  {
    trend: "실시간 콘텐츠 업데이트",
    importance: 'medium',
    currentStatus: 'poor',
    gapLevel: 'major',
    description: "트렌딩 레시피, 계절성 반영 부족",
    recommendedActions: [
      "🔧 실시간 트렌드 반영 시스템",
      "🔧 계절별 콘텐츠 자동 추천",
      "🔧 최신 요리 트렌드 포착"
    ]
  },
  {
    trend: "AI 콘텐츠 탐지 대응",
    importance: 'medium',
    currentStatus: 'good',
    gapLevel: 'minor',
    description: "인간적인 글쓰기는 있지만 더 강화 필요",
    recommendedActions: [
      "🔧 개인 경험담 추가",
      "🔧 감정적 요소 강화",
      "🔧 불완전한 인간적 표현"
    ]
  }
]

const statusColors = {
  excellent: "bg-green-100 text-green-800",
  good: "bg-blue-100 text-blue-800", 
  poor: "bg-orange-100 text-orange-800",
  missing: "bg-red-100 text-red-800"
}

const gapColors = {
  none: "bg-green-50 border-green-200",
  minor: "bg-yellow-50 border-yellow-200",
  major: "bg-orange-50 border-orange-200", 
  critical: "bg-red-50 border-red-200"
}

const statusIcons = {
  excellent: <CheckCircle className="w-5 h-5 text-green-500" />,
  good: <CheckCircle className="w-5 h-5 text-blue-500" />,
  poor: <Clock className="w-5 h-5 text-orange-500" />,
  missing: <XCircle className="w-5 h-5 text-red-500" />
}

export default function ModernSEOGapAnalysis() {
  const excellentCount = seoTrends.filter(t => t.currentStatus === 'excellent').length
  const poorMissingCount = seoTrends.filter(t => t.currentStatus === 'poor' || t.currentStatus === 'missing').length
  const criticalGaps = seoTrends.filter(t => t.gapLevel === 'critical').length

  return (
    <div className="space-y-6">
      {/* 전체 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            2025 SEO 트렌드 vs Spoonie 현재 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{excellentCount}</div>
              <div className="text-sm text-gray-600">완벽 구현</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{poorMissingCount}</div>
              <div className="text-sm text-gray-600">개선 필요</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{criticalGaps}</div>
              <div className="text-sm text-gray-600">긴급 대응</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">65%</div>
              <div className="text-sm text-gray-600">트렌드 적용</div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">자기비판적 분석 결과</span>
            </div>
            <p className="text-sm text-blue-700">
              기본 SEO와 AI 검색 최적화는 완벽하지만, <strong>의미론적 SEO</strong>와 
              <strong> 멀티모달 콘텐츠</strong>에서 심각한 격차가 있습니다.
              2025년 상위 노출을 위해 비디오 콘텐츠와 엔티티 기반 최적화가 시급합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 상세 트렌드 분석 */}
      <div className="space-y-4">
        {seoTrends.map((trend, index) => (
          <Card key={index} className={`${gapColors[trend.gapLevel]}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {statusIcons[trend.currentStatus]}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{trend.trend}</h3>
                    <Badge className={statusColors[trend.currentStatus]}>
                      {trend.currentStatus === 'excellent' ? '완벽' :
                       trend.currentStatus === 'good' ? '양호' :
                       trend.currentStatus === 'poor' ? '부족' : '없음'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      중요도: {trend.importance === 'critical' ? '긴급' :
                              trend.importance === 'high' ? '높음' : '중간'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{trend.description}</p>
                  
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">권장 액션:</span>
                    {trend.recommendedActions.map((action, actionIndex) => (
                      <div key={actionIndex} className="text-sm text-gray-700">
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 우선순위 액션 플랜 */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 즉시 실행해야 할 우선순위 액션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">🚨 1순위 (긴급)</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• 요리 과정 비디오 제작 및 YouTube 채널 개설</li>
                <li>• 멀티모달 콘텐츠 (텍스트+이미지+비디오) 통합</li>
                <li>• 엔티티 기반 키워드 리서치 및 토픽 클러스터 구축</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2">🔧 2순위 (1개월 내)</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• 대화형 질문-답변 콘텐츠 작성</li>
                <li>• 음성 검색 최적화 (긴 꼬리 키워드)</li>
                <li>• 실시간 트렌드 반영 시스템 구축</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">📈 3순위 (2-3개월 내)</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 개인화 & 지역화 콘텐츠 개발</li>
                <li>• AI 콘텐츠 탐지 대응 강화</li>
                <li>• 인터랙티브 레시피 도구 개발</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}