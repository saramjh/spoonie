import { Skeleton } from "@/components/ui/skeleton"

// Match the real square-photo RecipeCard grid during loading; do not show
// an old 4:3 sheet frame that jumps to another aspect ratio on data arrival.
export default function RecipeCardSkeleton() {
  return (
    <div className="min-w-0" aria-hidden>
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
