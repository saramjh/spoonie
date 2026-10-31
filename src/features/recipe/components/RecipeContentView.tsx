"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, CircleDot, Circle, Minus, Plus, CircleHelp, Undo2, RotateCcw } from "lucide-react"
import Link from "next/link"
import { Ingredient, RecipeStep } from "@/types/item"
import { formatAmount } from "@/features/recipe/domain/recipe-amount"
import { initialReferenceIndex, parseAmountInput, selectReference, scaleForReference, type Reference } from "@/features/recipe/domain/recipe-adjustment"
import { cn } from "@/lib/utils"
import StepMode from "@/features/recipe/components/StepMode"
import LinkifiedText from "@/components/common/LinkifiedText"
import { CheckBox, Photo, SectionHeading } from "@/components/kit"

interface RecipeContentViewProps {
	initialServings: number
	ingredients: Ingredient[]
	steps: RecipeStep[]
	recipeId?: string
}

const MIN_MAX_SERVINGS = 20
const CHANGED_HOLD_MS = 2500

export default function RecipeContentView({ initialServings, ingredients, steps, recipeId }: RecipeContentViewProps) {
	const baseServings = initialServings > 0 ? initialServings : 1
	const maxServings = Math.max(MIN_MAX_SERVINGS, baseServings * 2)
	const [servings, setServings] = useState(baseServings)
	const [reference, setReference] = useState<Reference | null>(null)
	const [adjusting, setAdjusting] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
	const [draftAmount, setDraftAmount] = useState("")
	const [history, setHistory] = useState<Array<{ reference: Reference | null; servings: number; selectedIndex: number | null; draftAmount: string }>>([])
	const [clearedChecks, setClearedChecks] = useState<Set<number> | null>(null)
	const [keyboardInset, setKeyboardInset] = useState(0)
	const [checked, setChecked] = useState<Set<number>>(() => new Set())
	const [doneSteps, setDoneSteps] = useState<Set<number>>(() => new Set())
	const [changed, setChanged] = useState<Set<number>>(() => new Set())
	const [stepModeAt, setStepModeAt] = useState<number | null>(null)
	const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const previousAmounts = useRef<number[] | null>(null)

	const scale = useMemo(() => {
		if (reference) return scaleForReference(ingredients, reference) ?? 1
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

	// Adjusting belongs to this viewer only; it never writes the published recipe.
	useEffect(() => {
		if (!adjusting || typeof window === "undefined") return
		const viewport = window.visualViewport
		if (!viewport) return
		const refresh = () => setKeyboardInset(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)))
		viewport.addEventListener("resize", refresh)
		viewport.addEventListener("scroll", refresh)
		refresh()
		return () => {
			viewport.removeEventListener("resize", refresh)
			viewport.removeEventListener("scroll", refresh)
		}
	}, [adjusting])

	const captureHistory = () => setHistory((items) => [...items.slice(-19), { reference, servings, selectedIndex, draftAmount }])
	const beginAdjusting = () => {
		const index = reference?.index ?? initialReferenceIndex(ingredients)
		if (index < 0) return
		setSelectedIndex(index)
		setDraftAmount(String(Number((ingredients[index].amount * scale).toPrecision(10))))
		setHistory([])
		setAdjusting(true)
	}
	const chooseReference = (index: number) => {
		if (index === selectedIndex) return
		const next = selectReference(ingredients, index, scale)
		if (!next) return
		captureHistory()
		setSelectedIndex(index)
		setReference(next)
		setDraftAmount(String(Number(next.target.toPrecision(10))))
	}
	const changeAmount = (text: string) => {
		captureHistory()
		setDraftAmount(text)
		const amount = parseAmountInput(text)
		if (amount !== null && selectedIndex !== null && scaleForReference(ingredients, { index: selectedIndex, target: amount }) !== null) setReference({ index: selectedIndex, target: amount })
	}
	const undoAdjustment = () => {
		const previous = history[history.length - 1]
		if (!previous) return
		setReference(previous.reference)
		setServings(previous.servings)
		setSelectedIndex(previous.selectedIndex)
		setDraftAmount(previous.draftAmount)
		setHistory((items) => items.slice(0, -1))
	}
	const finishAdjusting = () => {
		if (invalidAmount) return
		setAdjusting(false)
		setHistory([])
		setKeyboardInset(0)
	}

	const changeServings = (next: number) => {
		setReference(null)
		setServings(Math.min(maxServings, Math.max(1, next)))
	}

	const resetScale = () => {
		if (adjusting) captureHistory()
		setReference(null)
		setServings(baseServings)
		if (adjusting && selectedIndex !== null) setDraftAmount(String(ingredients[selectedIndex].amount))
	}

	const toggle = (set: Set<number>, index: number) => {
		const next = new Set(set)
		if (next.has(index)) next.delete(index)
		else next.add(index)
		return next
	}

	const isScaled = reference !== null || servings !== baseServings
	const referenceIngredient = reference ? ingredients[reference.index] : null
	const pendingAmount = parseAmountInput(draftAmount)
	const invalidAmount = adjusting && (pendingAmount === null || selectedIndex === null || scaleForReference(ingredients, { index: selectedIndex, target: pendingAmount }) === null)
	const adjustableCount = ingredients.filter((item) => Number.isFinite(item.amount) && item.amount > 0).length

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
							disabled={adjusting || (!reference && servings <= 1)}
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
							disabled={adjusting || (!reference && servings >= maxServings)}
							aria-label="1인분 늘리기"
							className="flex h-11 w-11 items-center justify-center text-ink disabled:text-ink-soft/40"
						>
							<Plus className="h-4 w-4" aria-hidden />
						</button>
					</div>
				</div>

				{adjustableCount > 0 && ingredients.length > 1 && !adjusting && (
					<button
						type="button"
						onClick={beginAdjusting}
						className="mt-2 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-label font-medium text-ink"
					>
						가진 재료 양에 맞추기
					</button>
				)}
				{adjusting && (
					<p className="mt-2 text-meta text-ink-soft">기준 재료 하나를 선택하고 보유한 양을 입력하세요. 다른 재료는 자동으로 계산됩니다.</p>
				)}
				{isScaled && !adjusting && (
					<p className="mt-2 text-meta text-ink-soft">
						{referenceIngredient
							? `${referenceIngredient.name} ${formatAmount(reference!.target, referenceIngredient.unit)}${referenceIngredient.unit}에 맞춘 양이에요.`
							: `원래 ${baseServings}인분 기준에서 바꾼 양이에요.`}{" "}
						<button type="button" onClick={resetScale} className="font-medium text-ink underline underline-offset-4">
							원래대로
						</button>
					</p>
				)}

				{scaled.length > 0 && (
					<div className="mt-2 flex min-w-0 items-start gap-1.5">
						<p className="min-w-0 flex-1 text-meta text-ink-soft">양념·조리 시간은 재료량과 같은 비율로 늘지 않을 수 있어요.</p>
						<Link href="/magazine" aria-label="인분 늘리기 안내" title="인분 늘리기 안내" className="-my-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							<CircleHelp className="h-4 w-4" aria-hidden />
						</Link>
					</div>
				)}

				{!adjusting && scaled.length > 0 && (
					<div className="mt-3 flex items-center justify-between gap-2 text-meta text-ink-soft">
						<span>재료 준비 {checked.size}/{ingredients.length}</span>
						<div className="flex items-center gap-2">
							{clearedChecks && checked.size === 0 && (
								<button type="button" onClick={() => { setChecked(new Set(clearedChecks)); setClearedChecks(null) }} className="min-h-11 px-2 font-medium text-ink">체크 되돌리기</button>
							)}
							{checked.size > 0 && (
								<button type="button" onClick={() => { setClearedChecks(new Set(checked)); setChecked(new Set()) }} className="min-h-11 px-2 font-medium text-ink">전체 해제</button>
							)}
						</div>
					</div>
				)}
				{scaled.length > 0 ? (
					<ul aria-label={adjusting ? "계산 기준 재료 선택" : undefined} className="mt-3 divide-y divide-border">
						{scaled.map((ing, index) => {
							const isChecked = checked.has(index)
							const amountText = formatAmount(ing.amount, ing.unit)
							const amountClass = cn(
								"rounded-sm px-1 text-heading tabular-nums transition-colors duration-500 motion-reduce:transition-none",
								changed.has(index) ? "bg-changed-mark text-ink" : "bg-transparent",
								isChecked && "text-ink-soft"
							)
							if (adjusting) {
								const selectable = Number.isFinite(ingredients[index].amount) && ingredients[index].amount > 0
								const selected = selectedIndex === index
								return (
									<li key={index} className="py-1">
										<button
											type="button"
											aria-pressed={selected}
											disabled={!selectable}
											onClick={() => chooseReference(index)}
											className={cn("flex min-h-12 w-full items-center gap-2 rounded-md px-2 text-left disabled:opacity-65", selected && "bg-paper-tint")}
										>
											{selected ? <CircleDot className="h-5 w-5 flex-shrink-0 text-ink" aria-hidden /> : <Circle className="h-5 w-5 flex-shrink-0 text-ink-soft" aria-hidden />}
											<span className="min-w-0 flex-1 text-read text-ink">{ing.name}</span>
											<span className="text-heading tabular-nums text-ink">{selected ? "기준" : amountText}</span>
											{!selected && <span className="text-meta text-ink-soft">{ing.unit}</span>}
										</button>
										{selected && (
											<div className="ml-9 mb-2 mt-1 flex items-center gap-2">
												<label htmlFor="adjust-reference-amount" className="text-meta text-ink-soft">보유량</label>
												<input
													id="adjust-reference-amount"
													aria-label={`${ing.name} 보유량`}
													aria-invalid={invalidAmount}
													aria-describedby={invalidAmount ? "adjustment-error" : undefined}
													inputMode="decimal"
													enterKeyHint="done"
													value={draftAmount}
													onChange={(event) => changeAmount(event.target.value)}
													onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur() }}
													className="h-11 w-28 min-w-0 rounded-md border border-border bg-paper px-2 text-right text-heading tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												/>
												<span className="text-meta text-ink-soft">{ing.unit}</span>
												{invalidAmount && <span id="adjustment-error" role="alert" className="text-meta text-destructive">수량을 확인하세요. 0보다 큰 적절한 숫자가 필요해요.</span>}
											</div>
										)}
									</li>
								)
							}
							return (
								<li key={index}>
									<button
										type="button"
										role="checkbox"
										aria-checked={isChecked}
										onClick={() => { setClearedChecks(null); setChecked((set) => toggle(set, index)) }}
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
											<p className="whitespace-pre-wrap break-words text-read"><LinkifiedText text={step.description} /></p>
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

			{adjusting && (
				<>
					<div className="h-24" aria-hidden />
					<div
						role="toolbar"
						aria-label="재료량 맞추기 도구"
						className="fixed left-1/2 z-[55] flex w-full max-w-md -translate-x-1/2 items-center gap-2 border-t border-border bg-paper px-3 py-2 shadow-lg"
						style={{ bottom: keyboardInset > 80 ? `${keyboardInset}px` : "calc(4rem + env(safe-area-inset-bottom))" }}
					>
						<button type="button" disabled={history.length === 0} onClick={undoAdjustment} className="flex h-11 items-center gap-1 rounded-md border border-border px-2 text-label text-ink disabled:opacity-40">
							<Undo2 className="h-4 w-4" aria-hidden />되돌리기
						</button>
						<button type="button" onClick={resetScale} className="flex h-11 items-center gap-1 rounded-md border border-border px-2 text-label text-ink">
							<RotateCcw className="h-4 w-4" aria-hidden />원래대로
						</button>
						<button type="button" disabled={invalidAmount} onClick={finishAdjusting} className="min-h-11 flex-1 rounded-md bg-primary px-3 text-label font-semibold text-primary-foreground disabled:opacity-50">완료</button>
					</div>
				</>
			)}
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
