import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
	return (
		<input
			type={type}
			className={cn(
				"flex h-10 w-full rounded-xl border border-input bg-background px-4 py-2 text-base transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1 focus-visible:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-gray-400",
				className
			)}
			ref={ref}
			{...props}
		/>
	)
})
Input.displayName = "Input"

export { Input }
