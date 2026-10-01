import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StateSheet } from "@/components/kit"

export default function NotFound() {
	return (
		<div className="px-3 pt-3">
			<StateSheet headingLevel="h1" title="찾는 페이지가 없어요" body="주소가 바뀌었거나, 글이 삭제되었거나, 작성자가 비공개로 돌렸을 수 있어요." action={<Button asChild><Link href="/">홈으로</Link></Button>} />
		</div>
	)
}
