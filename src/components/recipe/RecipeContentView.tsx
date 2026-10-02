"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Minus, Plus } from "lucide-react"
import { Ingredient, RecipeStep } from "@/types/item"
import { formatAmount } from "@/lib/recipe-amount"
import { cn } from "@/lib/utils"
import StepMode from "@/components/recipe/StepMode"
import { CheckBox, Photo, SectionHeading } from "@/components/kit"

interface RecipeContentViewProps {
	initialServings: number
	ingredients: Ingredient[]
	steps: RecipeStep[]
	recipeId?: string
}

const MIN_MAX_SERVINGS = 20
const CHANGED_HOLD_MS = 2500

interface Reference {
	index: number
	target: number
}

export default function RecipeContentView({ initialServings, ingredients, steps, recipeId }: RecipeContentViewProps) {
	const baseServings = initialServings > 0 ? initialServings : 1
	const maxServings = Math.max(MIN_MAX_SERVINGS, baseServings * 2)
	const [servings, setServings] = useState(baseServings)
	const [reference, setReference] = useState<Reference | null>(null)
	const [adjusting, setAdjusting] = useState(false)
	const [checked, setChecked] = useState<Set<number>>(() => new Set())
	const [doneSteps, setDoneSteps] = useState<Set<number>>(() => new Set())
	const [changed, setChanged] = useState<Set<number>>(() => new Set())
	const [stepModeAt, setStepModeAt] = useState<number | null>(null)
	const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const previousAmounts = useRef<number[] | null>(null)

	const scale = useMemo(() => {
		if (reference) {
			const base = ingredients[reference.index]?.amount
			return base && base > 0 ? reference.target / base : 1
		}
		return servings / baseServings
	}, [reference, ingredients, servings, baseServings])

	const scaled = useMemo(() => ingredients.map((ing) => ({ ...ing, amount: ing.amount * scale })), [ingredients, scale])

	// 양이 바뀐 재료는 잠시 표시를 유지해 무엇이 달라졌는지 놓치지 않게 한다
	useEffect(() => {
		const amounts = scaled.map((ing) => ing.amount)
		const previous = previousAmounts.current
		previousAmounts.current = amounts
		if (!previous) return
		const next = new Set<number>()
		amounts.forEach((amount, i) => {
			if (formatAmount(amount, scaled[i].unit) !== formatAmount(previous[i] ?? 0, scaled[i].unit)) next.add(i)
		})
		if (next.size === 0) return
		setChanged(next)
		if (holdTimer.current) clearTimeout(holdTimer.current)
		holdTimer.current = setTimeout(() => setChanged(new Set()), CHANGED_HOLD_MS)
	}, [scaled])

	useEffect(() => () => {
		if (holdTimer.current) clearTimeout(holdTimer.current)
	}, [])

	const changeServings = (next: number) => {
		setReference(null)
		setServings(Math.min(maxServings, Math.max(1, next)))
	}

	const resetScale = () => {
		setReference(null)
		setServings(baseServings)
	}

	const toggle = (set: Set<number>, index: number) => {
		const next = new Set(set)
		if (next.has(index)) next.delete(index)
		else next.add(index)
		return next
	}

	const isScaled = reference !== null || servings !== baseServings
	const referenceIngredient = reference ? ingredients[reference.index] : null

	return (
		<>
			<section aria-labelledby="ingredients-heading" className="border-t border-border px-4 pb-5 pt-5">
				<div className="flex items-center justify-between gap-3">
					<SectionHeading id="ingredients-heading" count={ingredients.length}>
						재료</SectionHeading>
					<div className="flex items-center rounded-lg border border-border" role="group" aria-label="인분 조절">
						<button
							type="button"
							onClick={() => changeServings((reference ? Math.round(baseServings * scale) : servings) - 1)}
							disabled={!reference && servings <= 1}
							aria-label="1인분 줄이기"
							className="flex h-11 w-11 items-center justify-center text-ink disabled:text-ink-soft/40"
						>
							<Minus className="h-4 w-4" aria-hidden />
						</button>
						<output aria-live="polite" className="min-w-[4.5rem] text-center text-body font-semibold tabular-nums text-ink">
							{reference ? "직접 맞춤" : `${servings}인분`}
						</output>
						<button
							type="button"
							onClick={() => changeServings((reference ? Math.round(baseServings * scale) : servings) + 1)}
							disabled={!reference && servings >= maxServings}
							aria-label="1인분 늘리기"
							className="flex h-11 w-11 items-center justify-center text-ink disabled:text-ink-soft/40"
						>
							<Plus className="h-4 w-4" aria-hidden />
						</button>
					</div>
				</div>

				{isScaled && (
					<p className="mt-2 text-meta text-ink-soft">
						{referenceIngredient
							? `${referenceIngredient.name} ${formatAmount(reference!.target, referenceIngredient.unit)}${referenceIngredient.unit}에 맞춘 양이에요.`
							: `원래 ${baseServings}인분 기준에서 바꾼 양이에요.`}{" "}
						<button type="button" onClick={resetScale} className="font-medium text-ink underline underline-offset-4">
							원래대로
						</button>
					</p>
				)}

				{scaled.length > 0 ? (
					<ul className="mt-3 divide-y divide-border">
						{scaled.map((ing, index) => {
							const isChecked = checked.has(index)
							const amountText = formatAmount(ing.amount, ing.unit)
							const amountClass = cn(
								"rounded-sm px-1 text-heading tabular-nums transition-colors duration-500 motion-reduce:transition-none",
								changed.has(index) ? "bg-changed-mark text-ink" : "bg-transparent",
								isChecked && "text-ink-soft"
							)
							if (adjusting) {
								return (
									<li key={index} className="flex min-h-12 items-center gap-3 py-2">
										<label htmlFor={`amount-${index}`} className="flex-1 text-read text-ink">
											{ing.name}
										</label>
										<span className="flex items-center gap-1">
											<input
												id={`amount-${index}`}
												inputMode="decimal"
												defaultValue={amountText.includes("/") ? String(Number(ing.amount.toFixed(2))) : amountText}
												onChange={(e) => {
													const value = parseFloat(e.target.value)
													if (Number.isFinite(value) && value > 0) setReference({ index, target: value })
												}}
												className="h-11 w-20 rounded-md border border-border bg-paper px-2 text-right text-heading tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											/>
											<span className="w-10 text-meta text-ink-soft">{ing.unit}</span>
										</span>
									</li>
								)
							}
							return (
								<li key={index}>
									<button
										type="button"
										role="checkbox"
										aria-checked={isChecked}
										onClick={() => setChecked((set) => toggle(set, index))}
										className="flex min-h-12 w-full items-center gap-3 py-2.5 text-left"
									>
										<CheckBox checked={isChecked} />
										<span className={cn("flex-1 text-read text-ink", isChecked && "text-ink-soft line-through decoration-ink-soft/70")}>{ing.name}</span>
										<span className="flex-shrink-0 text-right">
											<span className={amountClass}>{amountText}</span>
											{ing.unit && <span className={cn("text-label text-ink-soft", !amountText && "pl-1")}>{ing.unit}</span>}
										</span>
									</button>
								</li>
							)
						})}
					</ul>
				) : (
					<p className="mt-3 text-ink-soft">등록된 재료가 없어요.</p>
				)}

				{scaled.length > 1 && (
					<button
						type="button"
						onClick={() => setAdjusting((value) => !value)}
						className="mt-3 inline-flex min-h-11 items-center text-label font-medium text-ink underline underline-offset-4"
					>
						{adjusting ? "맞추기 끝내기" : "가진 재료 양에 맞추기"}
					</button>
				)}
			</section>

			<section aria-labelledby="steps-heading" className="border-t border-border px-4 pb-6 pt-5">
				<div className="flex items-center justify-between gap-3">
					<SectionHeading id="steps-heading">
						만드는 법 {steps.length > 0 && <span className="font-medium tabular-nums text-ink-soft">{steps.length}단계</span>}
					</SectionHeading>
					{steps.length > 0 && (
						<button
							type="button"
							onClick={() => setStepModeAt(firstUndone(steps.length, doneSteps))}
							className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-label font-semibold text-primary-foreground active:bg-primary/85"
						>
							요리 시작
						</button>
					)}
				</div>

				{steps.length > 0 ? (
					<ol className="mt-2">
						{steps.map((step, index) => {
							const isDone = doneSteps.has(index)
							return (
								<li key={index} id={`step-${index + 1}`} className="scroll-mt-16 border-b border-border last:border-b-0">
									<div className="flex gap-3 py-4">
										<button
											type="button"
											aria-pressed={isDone}
											aria-label={isDone ? `${index + 1}단계 끝냄 표시 지우기` : `${index + 1}단계 끝냄으로 표시`}
											onClick={() => setDoneSteps((set) => toggle(set, index))}
											className={cn(
												"-ml-1.5 flex h-11 w-11 flex-shrink-0 items-start justify-center pt-1 text-heading tabular-nums",
												isDone ? "text-ink-soft" : "text-ink"
											)}
										>
											{isDone ? <Check className="mt-0.5 h-5 w-5" strokeWidth={2.5} aria-hidden /> : index + 1}
										</button>
										<div className={cn("min-w-0 flex-1 pt-1", isDone && "text-ink-soft")}>
											<p className="whitespace-pre-wrap break-words text-read">{step.description}</p>
											{step.image_url && (
												<div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-[3px] bg-muted">
													<Photo src={step.image_url} alt={`${index + 1}단계 사진`} sizes="(max-width: 448px) 85vw, 380px" fit="contain" />
												</div>
											)}
										</div>
									</div>
								</li>
							)
						})}
					</ol>
				) : (
					<p className="mt-3 text-ink-soft">등록된 만드는 법이 없어요.</p>
				)}
			</section>

			{stepModeAt !== null && (
				<StepMode
					steps={steps}
					ingredients={scaled}
					servingsLabel={reference ? "직접 맞춘 양" : `${servings}인분`}
					startAt={stepModeAt}
					recipeId={recipeId}
					onStepDone={(index) => setDoneSteps((set) => new Set(set).add(index))}
					onClose={() => setStepModeAt(null)}
				/>
			)}
		</>
	)
}

function firstUndone(count: number, done: Set<number>) {
	for (let i = 0; i < count; i++) if (!done.has(i)) return i
	return 0
}
