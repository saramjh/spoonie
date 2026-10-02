import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// 버튼 규격: 44px(주요 하단 버튼 48px), 8px 모서리, 글자는 label. 주요 동작 면만 brand-orange (DESIGN.md Components)
const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-label font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary font-semibold text-primary-foreground hover:bg-primary/90 active:bg-primary/80 disabled:bg-muted disabled:text-ink-soft disabled:opacity-100",
				destructive: "bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90",
				outline: "border border-ink/20 bg-paper text-ink hover:border-ink/35 hover:bg-muted active:bg-muted",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "text-ink hover:bg-ink/5 active:bg-ink/10",
				link: "text-ink underline underline-offset-4",
			},
			size: {
				default: "h-11 px-4",
				sm: "h-10 px-3",
				lg: "h-12 px-5 font-semibold",
				icon: "h-11 w-11",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : "button"
	return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = "Button"

export { Button, buttonVariants }
