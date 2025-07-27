"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { timeAgo } from "@/lib/utils"
import clsx from "clsx"
import { getColorClass } from "@/lib/color-options"
import type { FeedItem } from "@/types/item" // 통합 타입 임포트

interface RecipeCardProps {
  item: FeedItem; // recipe -> item으로 변경
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
}

export default function RecipeCard({ item, isSelectable, isSelected, onSelectChange }: RecipeCardProps) {
  return (
    <Card className="relative group overflow-hidden shadow-bauhaus hover:shadow-bauhaus-lg h-full flex flex-col transition-all duration-300 transform hover:scale-105 hover:z-10">
      {isSelectable && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox checked={isSelected} onCheckedChange={onSelectChange} className="h-6 w-6 bg-white/80 backdrop-blur-sm rounded-full data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
        </div>
      )}
      {item.color_label && <div className={clsx("absolute top-3 right-3 z-10 w-4 h-4 rounded-full ring-2 ring-white", getColorClass(item.color_label, "lightColor"))} />}
      			<Link href={`/posts/${item.item_id}`} className="flex flex-col h-full"> {/* 경로는 통합된 상세 페이지로 */}
        <div className="relative w-full h-48 flex-shrink-0">
          {item.image_urls && item.image_urls.length > 0 ? (
            <Image src={item.image_urls[0]} alt={item.title || "Recipe Image"} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-orange-50 flex items-center justify-center">
              <span className="text-orange-500 font-bold text-lg">Spoonie</span>
            </div>
          )}
        </div>
        <CardHeader className="flex-grow">
          <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2">{item.title}</CardTitle>
          <CardDescription className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-end pt-0">
          <div className="flex flex-wrap gap-2 mb-2">
            {item.tags?.slice(0, 3).map((tag: string, idx: number) => (
              <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">
                #{tag}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-auto">{timeAgo(item.created_at)}</p>
        </CardContent>
      </Link>
    </Card>
  )
}