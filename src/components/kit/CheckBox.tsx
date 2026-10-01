import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// 체크 표시(모양만). 누르는 동작과 접근성 역할은 감싸는 버튼이 맡는다 (role="checkbox", aria-checked)
export function CheckBox({ checked, className }: { checked: boolean; className?: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px]",
				checked ? "border-ink bg-ink text-paper" : "border-ink-soft bg-paper",
				className
			)}
		>
			{checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
		</span>
	)
}
