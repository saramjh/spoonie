import { RECIPE_COLOR_OPTIONS } from "@/features/recipe/domain/color-options"
import { cn } from "@/lib/utils"
import { Magnet } from "./Magnet"

// 색상 라벨 고르기: 같은 자석을 다시 누르면 선택이 풀린다. 레시피 작성 폼과 레시피북 거르기에서 같이 쓴다
interface ColorLabelPickerProps {
	value: string | null | undefined
	onChange: (value: string | null) => void
	className?: string
}

export function ColorLabelPicker({ value, onChange, className }: ColorLabelPickerProps) {
	return (
		<div className={cn("flex flex-wrap", className)}>
			{RECIPE_COLOR_OPTIONS.map((option) => {
				const selected = value === option.value
				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={selected}
						aria-label={option.label}
						onClick={() => onChange(selected ? null : option.value)}
						className="flex h-11 w-11 items-center justify-center"
					>
						<Magnet color={option.value} size="lg" decorative className={selected ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : undefined} />
					</button>
				)
			})}
		</div>
	)
}
