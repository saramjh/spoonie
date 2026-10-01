"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StateSheet } from "@/components/kit"

interface CreateContentAuthPromptProps {
  contentType: "recipe" | "post"
}

// 비로그인으로 작성 화면에 들어온 경우: 폼을 흐리게 깔지 않고 종이 한 장으로 안내한다.
// 로그인 후에는 지금 주소(출처·fork 파라미터 포함)로 돌아와 바로 쓸 수 있다.
export default function CreateContentAuthPrompt({ contentType }: CreateContentAuthPromptProps) {
  const [next, setNext] = useState("/")
  useEffect(() => {
    setNext(window.location.pathname + window.location.search)
  }, [])
  const isRecipe = contentType === "recipe"

  return (
    <div className="px-3 pt-3">
      <StateSheet headingLevel="h1" title={isRecipe ? "레시피를 쓰려면 로그인해 주세요" : "레시피드를 쓰려면 로그인해 주세요"} body={isRecipe ? "쓴 레시피는 내 레시피북에 모여서 요리할 때 다시 꺼내 볼 수 있어요." : "만든 요리를 남기면 원래 레시피와 이어지고, 작성자에게도 알려져요."} action={<Button asChild><Link href={`/login?next=${encodeURIComponent(next)}`}>로그인하고 쓰기</Link></Button>} />
    </div>
  )
}
