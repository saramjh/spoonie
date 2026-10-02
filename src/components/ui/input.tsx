import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
	return (
		<input
			type={type}
			className={cn(
				// 입력칸 규격: 버튼과 같은 44px·8px 모서리, 옅은 테두리, 포커스 때만 흑연 테두리 (DESIGN.md Components)
				"flex h-11 w-full rounded-lg border border-ink/20 bg-paper px-3.5 text-body text-ink transition-colors duration-150 placeholder:text-ink-soft/80 hover:border-ink/35 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-meta file:font-medium",
				className
			)}
			ref={ref}
			{...props}
		/>
	)
})
Input.displayName = "Input"

export { Input }
