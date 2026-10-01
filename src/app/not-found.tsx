import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
	return (
		<div className="px-3 pt-3">
			<section className="rounded-[3px] bg-paper px-5 py-6 shadow-sheet">
				<h1 className="text-xl font-bold text-ink">찾는 페이지가 없어요</h1>
				<p className="mt-2 text-[15px] leading-relaxed text-ink-soft">주소가 바뀌었거나, 글이 삭제되었거나, 작성자가 비공개로 돌렸을 수 있어요.</p>
				<Button asChild className="mt-5">
					<Link href="/">홈으로 가기</Link>
				</Button>
			</section>
		</div>
	)
}
