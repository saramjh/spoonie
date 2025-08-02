"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function RecipeBookAuthPrompt({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <div className={cn("flex flex-col items-center justify-start min-h-screen p-4 pt-4", className)}>
      <Card className="w-full max-w-sm p-8 text-center shadow-xl rounded-3xl bg-white border border-gray-100">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
            <Image
              src="/logo-full.svg"
              alt="Spoonie Logo"
              width={32}
              height={10}
              className="text-orange-500"
            />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">레시피북은 회원만 이용할 수 있어요</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Spoonie에 가입하고 나만의 레시피를 기록하고, 관리하고, 다른 사용자들의 레시피를 탐색해보세요!
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
      </Card>
    </div>
  );
}
