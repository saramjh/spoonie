import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => {
	return (
		<textarea
			className={cn(
				"flex min-h-[88px] w-full resize-none rounded-lg border border-ink/20 bg-paper px-3.5 py-3 text-body text-ink transition-colors duration-150 placeholder:text-ink-soft/80 hover:border-ink/35 focus-visible:border-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			ref={ref}
			{...props}
		/>
	)
})
Textarea.displayName = "Textarea"

export { Textarea }
