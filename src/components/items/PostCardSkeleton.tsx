import { Skeleton } from '@/components/ui/skeleton'
import { Sheet } from "@/components/kit"

export default function PostCardSkeleton() {
  return (
    <Sheet className="overflow-hidden" aria-hidden>
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-grow space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 px-4 py-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Sheet>
  )
}
