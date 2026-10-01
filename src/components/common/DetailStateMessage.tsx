import Link from "next/link"
import { Button } from "@/components/ui/button"

interface DetailStateMessageProps {
	title: string
	body: string
	onRetry?: () => void
	link?: { href: string; label: string }
}

// 상세 화면의 오류·빈 상태: 종이 한 장에 무슨 일인지와 다음 행동 하나 (기술 오류 문구는 보여 주지 않는다)
export default function DetailStateMessage({ title, body, onRetry, link }: DetailStateMessageProps) {
	return (
		<div className="px-3 pt-3">
			<section className="rounded-[3px] bg-paper px-5 py-6 shadow-sheet">
				<h1 className="text-xl font-bold text-ink">{title}</h1>
				<p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{body}</p>
				{onRetry && (
					<Button className="mt-5" onClick={onRetry}>
						다시 불러오기
					</Button>
				)}
				{link && (
					<Button asChild variant={onRetry ? "outline" : "default"} className={onRetry ? "ml-2 mt-5" : "mt-5"}>
						<Link href={link.href}>{link.label}</Link>
					</Button>
				)}
			</section>
		</div>
	)
}
