"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, User } from "lucide-react"
import { getColorClass } from "@/lib/color-options"
import type { FeedItem } from "@/types/item" // 통합 타입 임포트

interface RecipeListCardProps {
  item: FeedItem; // recipe -> item
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  showAuthor?: boolean;
}

export default function RecipeListCard({ item, isSelectable = false, isSelected = false, onSelectChange, showAuthor = false }: RecipeListCardProps) {
  const handleSelectChange = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(checked);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <Card className="group cursor-pointer hover:bg-gray-50 transition-all duration-300 shadow-bauhaus hover:shadow-bauhaus-lg transform hover:scale-[1.02]">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            {item.image_urls && item.image_urls.length > 0 ? (
              <Image src={item.image_urls[0]} alt={item.title || "Recipe Image"} width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                			<Link href={`/posts/${item.item_id}`}>
                  <h3 className="font-semibold text-lg truncate group-hover:text-orange-600 transition-colors">{item.title}</h3>
                </Link>
                {item.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>}

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  {showAuthor && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{item.display_name || "사용자"}</span>
                    </div>
                  )}
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">{tag}</Badge>
                    ))}
                    {item.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs px-2 py-0">+{item.tags.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {item.color_label && <div className={`w-4 h-4 rounded-full ${getColorClass(item.color_label, "mediumColor")}`} />}
                {isSelectable && <Checkbox checked={isSelected} onCheckedChange={handleSelectChange} className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}