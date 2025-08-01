/**
 * 🤖 AI 검색 최적화 GAP 분석 컴포넌트
 * 현재 부족한 부분들을 시각화
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react"

interface AISearchGap {
  title: string
  status: 'completed' | 'partial' | 'missing'
  impact: 'high' | 'medium' | 'low'
  aiPlatforms: string[]
  description: string
  action: string
}

const gaps: AISearchGap[] = [
  // ✅ 완료된 것들
  {
    title: "Schema.org Recipe 구조화 데이터",
    status: "completed",
    impact: "high",
    aiPlatforms: ["ChatGPT", "Perplexity", "Claude", "Google AI"],
    description: "레시피 스키마 완벽 구현 (재료, 조리법, 작성자, 이미지)",
    action: "✅ 완료됨"
  },
  {
    title: "동적 메타데이터 & Open Graph",
    status: "completed", 
    impact: "high",
    aiPlatforms: ["모든 AI 검색 엔진"],
    description: "페이지별 최적화된 title, description, 소셜 공유 최적화",
    action: "✅ 완료됨"
  },
  {
    title: "사이트맵 & robots.txt",
    status: "completed",
    impact: "high", 
    aiPlatforms: ["모든 AI 검색 엔진"],
    description: "AI 크롤링 최적화 및 색인 가이드",
    action: "✅ 완료됨"
  },

  // ⚠️ 부분 구현
  {
    title: "자연어 대화형 콘텐츠",
    status: "partial",
    impact: "high",
    aiPlatforms: ["ChatGPT", "Claude"],
    description: "키워드 중심 → 질문-답변 형태 콘텐츠 전환 필요",
    action: "🔄 '어떻게', '왜', '무엇을' 형태로 콘텐츠 재작성"
  },
  {
    title: "E-E-A-T 신호 (전문성, 권위성)",
    status: "partial",
    impact: "high",
    aiPlatforms: ["Google AI", "Perplexity"],
    description: "작성자 전문성, 자격증명, 리뷰 시스템 부족",
    action: "🔄 전문가 프로필, 인증, 사용자 평가 시스템 추가"
  },

  // ❌ 긴급 필요
  {
    title: "FAQ Schema 마크업",
    status: "missing",
    impact: "high",
    aiPlatforms: ["모든 AI 검색 엔진"],
    description: "AI가 Q&A 추출할 수 있는 구조화 데이터 없음",
    action: "🚨 즉시 FAQ 스키마 구현 필요"
  },
  {
    title: "HowTo Schema (완전한)",
    status: "missing",
    impact: "high", 
    aiPlatforms: ["ChatGPT", "Google AI"],
    description: "조리법 단계별 스키마 미완성",
    action: "🚨 레시피 단계별 HowTo 스키마 완성"
  },
  {
    title: "권위성 있는 Citation 콘텐츠",
    status: "missing",
    impact: "high",
    aiPlatforms: ["Perplexity", "Claude", "ChatGPT"],
    description: "AI가 인용할 만한 독창적 연구, 통계, 전문가 의견 부족",
    action: "🚨 인용 가능한 고품질 권위 콘텐츠 개발"
  }
]

const statusIcons = {
  completed: <CheckCircle className="w-5 h-5 text-green-500" />,
  partial: <Clock className="w-5 h-5 text-yellow-500" />,
  missing: <XCircle className="w-5 h-5 text-red-500" />
}

const statusColors = {
  completed: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800", 
  missing: "bg-red-100 text-red-800"
}

const impactColors = {
  high: "bg-red-50 border-red-200",
  medium: "bg-yellow-50 border-yellow-200",
  low: "bg-blue-50 border-blue-200"
}

export default function AISearchGaps() {
  const completedCount = gaps.filter(g => g.status === 'completed').length
  const partialCount = gaps.filter(g => g.status === 'partial').length
  const missingCount = gaps.filter(g => g.status === 'missing').length
  const criticalMissing = gaps.filter(g => g.status === 'missing' && g.impact === 'high').length

  return (
    <div className="space-y-6">
      {/* 전체 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            AI 검색 최적화 상태 (55/100점)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-gray-600">완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{partialCount}</div>
              <div className="text-sm text-gray-600">부분완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{missingCount}</div>
              <div className="text-sm text-gray-600">누락</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-800">{criticalMissing}</div>
              <div className="text-sm text-gray-600">긴급누락</div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">부분적 준비 상태</span>
            </div>
            <p className="text-sm text-yellow-700">
              기본 SEO는 완벽하지만, AI 검색 특화 요소가 부족합니다. 
              특히 FAQ 스키마와 대화형 콘텐츠가 시급히 필요합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 상세 GAP 분석 */}
      <div className="space-y-4">
        {gaps.map((gap, index) => (
          <Card key={index} className={`${impactColors[gap.impact]}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {statusIcons[gap.status]}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{gap.title}</h3>
                    <Badge className={statusColors[gap.status]}>
                      {gap.status === 'completed' ? '완료' : 
                       gap.status === 'partial' ? '부분' : '누락'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {gap.impact === 'high' ? '높음' : 
                       gap.impact === 'medium' ? '중간' : '낮음'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{gap.description}</p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-500">AI 플랫폼:</span>
                    <div className="flex gap-1">
                      {gap.aiPlatforms.map((platform, pIndex) => (
                        <Badge key={pIndex} variant="secondary" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-700">
                    {gap.action}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI 플랫폼별 최적화 수준 */}
      <Card>
        <CardHeader>
          <CardTitle>AI 플랫폼별 최적화 수준</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Bing Copilot", score: 65, reason: "기본 SEO 잘됨" },
              { name: "Google AI", score: 60, reason: "SEO 기반 강함, E-E-A-T 부족" },
              { name: "ChatGPT", score: 55, reason: "Schema 좋음, FAQ/대화형 부족" },
              { name: "Claude", score: 50, reason: "대화형 콘텐츠 부족" },
              { name: "Perplexity", score: 45, reason: "권위성 콘텐츠 부족" }
            ].map((platform, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium">{platform.name}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      platform.score >= 70 ? 'bg-green-500' :
                      platform.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${platform.score}%` }}
                  />
                </div>
                <div className="text-sm font-bold w-8">{platform.score}</div>
                <div className="text-xs text-gray-500 w-40">{platform.reason}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}