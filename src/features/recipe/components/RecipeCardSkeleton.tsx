import { Skeleton } from '@/components/ui/skeleton'
import { Sheet } from "@/components/kit"

export default function RecipeCardSkeleton() {
  return (
    <Sheet className="overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 px-3 pb-3 pt-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Sheet>
  )
}
