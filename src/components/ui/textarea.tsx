import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => {
	return (
		<textarea
			className={cn(
				"flex min-h-[80px] w-full rounded-md border border-ink/40 bg-paper px-4 py-3 text-base transition-all duration-200 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-ink disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-ink-soft resize-none",
				className
			)}
			ref={ref}
			{...props}
		/>
	)
})
Textarea.displayName = "Textarea"

export { Textarea }
