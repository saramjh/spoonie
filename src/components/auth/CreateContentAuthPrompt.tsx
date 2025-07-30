"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PenTool, ChefHat } from "lucide-react"

interface CreateContentAuthPromptProps {
  contentType: 'recipe' | 'post'
  children: React.ReactNode
}

export default function CreateContentAuthPrompt({ contentType, children }: CreateContentAuthPromptProps) {
  const router = useRouter()
  const isRecipe = contentType === 'recipe'

  return (
    <div className="relative h-full">
      {/* 블러 처리된 백그라운드 */}
      <div className="blur-sm pointer-events-none">
        {children}
      </div>
      
      {/* 비회원 블러 오버레이 */}
      <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm mx-auto text-center shadow-2xl">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              {isRecipe ? (
                <ChefHat className="w-8 h-8 text-orange-500" />
              ) : (
                <PenTool className="w-8 h-8 text-orange-500" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {isRecipe ? "레시피 작성은" : "레시피드 작성은"} 회원만 가능해요
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Spoonie에 가입하고 나만의 {isRecipe ? "레시피" : "레시피드"}를 세상과 공유해보세요! 
              다른 사용자들과 요리의 즐거움을 나눌 수 있어요.
            </p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold">
              <Link href="/login">로그인 / 회원가입</Link>
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-semibold" 
              onClick={() => router.back()}
            >
              뒤로 가기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 