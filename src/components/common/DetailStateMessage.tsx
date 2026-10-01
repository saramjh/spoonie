import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StateSheet } from "@/components/kit"

interface DetailStateMessageProps {
	title: string
	body: string
	onRetry?: () => void
	link?: { href: string; label: string }
}

// 상세 화면의 오류·빈 상태 (기술 오류 문구는 보여 주지 않는다)
export default function DetailStateMessage({ title, body, onRetry, link }: DetailStateMessageProps) {
	return (
		<div className="px-3 pt-3">
			<StateSheet
				headingLevel="h1"
				title={title}
				body={body}
				action={
					<>
						{onRetry && <Button onClick={onRetry}>다시 불러오기</Button>}
						{link && (
							<Button asChild variant={onRetry ? "outline" : "default"}>
								<Link href={link.href}>{link.label}</Link>
							</Button>
						)}
					</>
				}
			/>
		</div>
	)
}
