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
    <div className="relative w-full h-screen overflow-hidden">
      {/* 블러 처리된 백그라운드 - 전체 화면 (아주 약한 블러) */}
      <div className="absolute inset-0 blur-[1px] pointer-events-none">
        {children}
      </div>
      
      {/* 비회원 블러 오버레이 - 전체 화면 덮기 (약한 어둠 효과) */}
      <div className="absolute inset-0 z-50 bg-black/15 flex items-start justify-center p-6 pt-8 sm:pt-12">
        <div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center shadow-2xl border border-gray-100">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              {isRecipe ? (
                <ChefHat className="w-8 h-8 text-orange-500" />
              ) : (
                <PenTool className="w-8 h-8 text-orange-500" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isRecipe ? "레시피 작성은" : "레시피드 작성은"} 회원만 가능해요
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Spoonie에 가입하고 나만의 {isRecipe ? "레시피" : "레시피드"}를 세상과 공유해보세요! 
              다른 사용자들과 요리의 즐거움을 나눌 수 있어요.
            </p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full h-14 text-base font-semibold bg-orange-500 hover:bg-orange-600 rounded-2xl">
              <Link href="/login">로그인 / 회원가입</Link>
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-14 text-base font-medium border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl" 
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