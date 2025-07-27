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
    <div className={cn("flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4", className)}>
      <Card className="w-full max-w-md p-6 text-center shadow-lg rounded-xl bg-orange-50 border-orange-500">
        <div className="mb-6">
          <Image
            src="/logo-full.svg"
            alt="Spoonie Logo"
            width={150}
            height={150}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">나만의 레시피북을 만들어보세요!</h2>
          <p className="text-gray-700">
            로그인하고 나만의 레시피를 기록하고, 관리하고, 세상과 공유하는 즐거움을 경험하세요.
          </p>
        </div>
        <div className="space-y-4">
          <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-3 rounded-lg">
            <Link href="/login">로그인 / 회원가입</Link>
          </Button>
          <Button variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-100 text-lg py-3 rounded-lg" onClick={() => router.push("/recipes?tab=all")}>
            모두의 레시피 보러가기
          </Button>
        </div>
      </Card>
    </div>
  );
}
