import { ChefHat } from "lucide-react"
import type { Item } from "@/types/item"
import { Photo } from "@/components/kit"
import { splitRecipeReferences } from "@/features/recipe/domain/inline-recipe-reference"
import { tokenizeTextLinks } from "@/shared/lib/external-text-links"

/** Plain React-escaped prose with safe HTTP links and RLS-visible recipe references. */
export default function LinkifiedText({
  text, recipes = [],
}: { text: string | null | undefined; recipes?: Item[] }) {
  const byId = new Map(recipes.map(recipe => [recipe.id, recipe]))
  return <>
    {splitRecipeReferences(text ?? "").map((part, index) => {
      if (part.recipeId) {
        const recipe = byId.get(part.recipeId)
        if (!recipe) {
          return <span key={index} className="mx-0.5 inline-flex max-w-[15rem] items-center rounded-[6px] border border-border bg-paper-tint px-1.5 py-0.5 align-baseline text-[0.9em] text-ink-soft" title="삭제되었거나 볼 수 없는 레시피">볼 수 없는 레시피</span>
        }
        return (
          <a
            key={index}
            href={"/recipes/" + part.recipeId}
            onClick={event => event.stopPropagation()}
            aria-label={"레시피 열기: " + (recipe.title || "레시피")}
            title={recipe.title ?? undefined}
            className="mx-0.5 inline-flex max-w-[min(15rem,75vw)] items-center gap-1 rounded-[6px] border border-border bg-paper-tint px-1.5 py-0.5 align-baseline text-[0.9em] font-medium leading-tight text-ink no-underline hover:border-primary hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            {recipe.image_urls?.[0] ?
              <span className="relative h-[17px] w-[17px] shrink-0 overflow-hidden rounded-[3px]"><Photo src={recipe.image_urls[0]} sizes="17px" /></span>
              : <ChefHat className="h-[14px] w-[14px] shrink-0" aria-hidden />}
            <span className="truncate">{recipe.title}</span>
          </a>
        )
      }
      return tokenizeTextLinks(part.text ?? "").map((segment, i) => segment.href
        ? <a key={index + "-" + i} href={segment.href} target="_blank" rel="noopener noreferrer nofollow ugc"
            className="font-medium text-ink underline decoration-ink-soft underline-offset-2 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">{segment.text}</a>
        : <span key={index + "-" + i}>{segment.text}</span>)
    })}
  </>
}
