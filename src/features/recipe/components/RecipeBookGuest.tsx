import Link from "@/components/kit/NavigationLink"
import { Button } from "@/components/ui/button"
import { StateSheet } from "@/components/kit"

// The guest sees no private recipe contents. Signup remains on the login page.
export default function RecipeBookGuest() {
  return (
    <section className="w-full px-3.5 pb-8 pt-4 text-ink">
      <h1 className="text-display font-semibold">레시피북</h1>
      <StateSheet
        variant="locked"
        headingLevel="h2"
        title="로그인하고 이어서 볼 수 있어요"
        body="내 레시피와 저장한 글을 한곳에서 관리해 보세요."
        action={<Button asChild className="min-h-12 px-5"><Link href="/login?next=%2Frecipes">로그인</Link></Button>}
      />
    </section>
  )
}
