'use client'

import { Card, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function RecipeCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-lg sm:rounded-xl shadow-sm h-full flex flex-col">
      <Skeleton className="w-full aspect-[4/3]" />
      <CardHeader className="flex-grow p-2 sm:p-3">
        <Skeleton className="h-3 sm:h-4 w-3/4 mb-1 sm:mb-1.5" />
        <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5">
          <Skeleton className="h-4 sm:h-5 w-8 sm:w-12 rounded-full" />
          <Skeleton className="h-2 sm:h-3 w-0.5 rounded-full" />
          <Skeleton className="h-2 sm:h-3 w-6 sm:w-8 rounded" />
        </div>
      </CardHeader>
    </Card>
  )
}
