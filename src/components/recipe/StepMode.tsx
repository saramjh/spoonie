"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { X } from "lucide-react"
import { Ingredient, RecipeStep } from "@/types/item"
import { formatAmount } from "@/lib/recipe-amount"
import { cn } from "@/lib/utils"
import { logEvent } from "@/lib/events"
import { useRouter } from "@/lib/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"

interface StepModeProps {
	steps: RecipeStep[]
	ingredients: Ingredient[]
	servingsLabel: string
	startAt: number
	recipeId?: string
	onStepDone: (index: number) => void
	onClose: () => void
}

type WakeLockSentinelLike = { release: () => Promise<void> }

// 요리하는 동안 쓰는 전체 화면 단계 보기.
// 화면이 꺼지지 않게 하고, 지금 단계만 크게 보여 주며, 이전/다음은 엄지가 닿는 아래쪽에 둔다.
export default function StepMode({ steps, ingredients, servingsLabel, startAt, recipeId, onStepDone, onClose }: StepModeProps) {
	const router = useRouter()
	const [index, setIndex] = useState(startAt)
	const [finished, setFinished] = useState(false)
	const [showIngredients, setShowIngredients] = useState(false)
	const closeRef = useRef<HTMLButtonElement>(null)
	const touchStartX = useRef<number | null>(null)
	const isLast = index === steps.length - 1
	const step = steps[index]

	const go = useCallback(
		(next: number) => {
			if (next > index) onStepDone(index)
			setIndex(Math.min(steps.length - 1, Math.max(0, next)))
			setShowIngredients(false)
		},
		[index, onStepDone, steps.length]
	)

	// 마지막 단계를 마치면 바로 닫지 않고 "사진으로 남기기"를 권한다 (만들어 본 기록이 원래 레시피와 이어진다)
	const finish = useCallback(() => {
		onStepDone(index)
		setFinished(true)
		logEvent("cook_complete", recipeId, "cook_mode")
	}, [index, onStepDone, recipeId])

	// 요리 모드를 연 횟수 기록 (개발 모드의 effect 이중 실행에도 한 번만)
	const startLogged = useRef(false)
	useEffect(() => {
		if (startLogged.current) return
		startLogged.current = true
		logEvent("cook_start", recipeId, "cook_mode")
	}, [recipeId])

	// 화면 켜짐 유지: 탭을 다시 보면 잠금이 풀리므로 그때 다시 요청한다
	useEffect(() => {
		let sentinel: WakeLockSentinelLike | null = null
		const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }
		const request = async () => {
			try {
				sentinel = (await nav.wakeLock?.request("screen")) ?? null
			} catch {
				sentinel = null
			}
		}
		const onVisible = () => {
			if (document.visibilityState === "visible") request()
		}
		request()
		document.addEventListener("visibilitychange", onVisible)
		return () => {
			document.removeEventListener("visibilitychange", onVisible)
			sentinel?.release().catch(() => {})
		}
	}, [])

	useEffect(() => {
		const previousOverflow = document.body.style.overflow
		document.body.style.overflow = "hidden"
		closeRef.current?.focus()
		return () => {
			document.body.style.overflow = previousOverflow
		}
	}, [])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose()
			else if (e.key === "ArrowRight") go(index + 1)
			else if (e.key === "ArrowLeft") go(index - 1)
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [go, index, onClose])

	if (!step) return null

	return createPortal(
		<div role="dialog" aria-modal="true" aria-label="요리 모드" className="fixed inset-0 z-[70] flex flex-col bg-door text-ink">
			<div className="flex items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),8px)]">
				<button ref={closeRef} type="button" onClick={onClose} aria-label="요리 모드 닫기" className="flex h-11 w-11 items-center justify-center">
					<X className="h-6 w-6" aria-hidden />
				</button>
				<p className="flex-1 text-base font-semibold tabular-nums" aria-live="polite">
					{index + 1} <span className="font-normal text-ink-soft">/ {steps.length}단계</span>
				</p>
				<button
					type="button"
					onClick={() => setShowIngredients((value) => !value)}
					aria-expanded={showIngredients}
					className="h-11 px-3 text-[15px] font-medium underline underline-offset-4"
				>
					재료 {servingsLabel}
				</button>
			</div>

			{/* 단계 레일: 전체 단계 수와 지금 위치 */}
			<div className="flex gap-1 px-4 pb-3 pt-1" aria-hidden>
				{steps.map((_, i) => (
					<span key={i} className={cn("h-1 flex-1 rounded-full", i <= index ? "bg-ink" : "bg-paper")} />
				))}
			</div>

			<div
				className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-3"
				onTouchStart={(e) => {
					touchStartX.current = e.touches[0].clientX
				}}
				onTouchEnd={(e) => {
					if (touchStartX.current === null) return
					const delta = e.changedTouches[0].clientX - touchStartX.current
					touchStartX.current = null
					if (Math.abs(delta) < 60) return
					go(delta < 0 ? index + 1 : index - 1)
				}}
			>
				{finished ? (
					<div className="rounded-[3px] bg-paper px-5 py-6 shadow-sheet">
						<h2 className="text-[26px] font-bold leading-tight">다 만들었어요</h2>
						<p className="mt-3 text-[17px] leading-[1.6] text-ink-soft">
							사진 한 장과 한 줄이면 이 레시피의 &lsquo;만들어 본 기록&rsquo;으로 남아요. 레시피를 쓴 사람에게도 알려 줘요.
						</p>
					</div>
				) : (
				<div key={index} className="min-h-[45dvh] rounded-[3px] bg-paper px-5 py-6 shadow-sheet motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
					{step.image_url && (
						<div className="relative -mx-5 -mt-6 mb-5 h-[min(40dvh,75vw)] overflow-hidden rounded-t-[3px] bg-muted">
							{/* 요리 중에는 사진 전체가 정보다: 자르지 않고 프레임 안에 맞춘다 */}
							<Image src={step.image_url} alt={`${index + 1}단계 사진`} fill sizes="100vw" className="object-contain" />
						</div>
					)}
					<p className="whitespace-pre-wrap break-words text-[26px] font-medium leading-[1.55]">{step.description}</p>
				</div>

				)}

				{/* 다음 단계를 미리 보여 주어 손을 멈추지 않고 준비할 수 있게 한다 */}
				{!finished && !isLast && (
					<div className="mt-3 px-2 text-ink-soft">
						<p className="text-sm font-semibold">다음 · {index + 2}단계</p>
						<p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[17px] leading-[1.6]">{steps[index + 1].description}</p>
					</div>
				)}

				{showIngredients && (
					<div className="absolute inset-x-3 top-0 max-h-full overflow-y-auto rounded-[3px] bg-paper px-5 py-4 shadow-sheet">
						<p className="text-sm font-semibold text-ink-soft">재료 · {servingsLabel}</p>
						<ul className="mt-2 divide-y divide-border">
							{ingredients.map((ing, i) => (
								<li key={i} className="flex justify-between gap-3 py-2.5 text-[17px]">
									<span>{ing.name}</span>
									<span className="font-semibold tabular-nums">
										{formatAmount(ing.amount, ing.unit)}
										<span className="font-normal text-ink-soft">{ing.unit}</span>
									</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			{finished ? (
			<div className="grid grid-cols-[1fr_2fr] gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
				<button type="button" onClick={onClose} className="h-14 rounded-lg border border-ink/20 bg-paper text-[17px] font-semibold">
					닫기
				</button>
				<button
					type="button"
					onClick={async () => {
						// 요리한 경험을 나누려 할 때 가입을 권한다: 비로그인이면 로그인 후 바로 작성 화면으로 이어진다
						const target = `/posts/new?source=${recipeId}&origin=cook_mode`
						const { data } = await createSupabaseBrowserClient().auth.getSession()
						router.push(data.session ? target : `/login?next=${encodeURIComponent(target)}`)
					}}
					disabled={!recipeId}
					className="h-14 rounded-lg bg-primary text-[17px] font-bold text-primary-foreground active:brightness-95"
				>
					사진으로 남기기
				</button>
			</div>
			) : (
			<div className="grid grid-cols-[1fr_2fr] gap-2 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
				<button
					type="button"
					onClick={() => go(index - 1)}
					disabled={index === 0}
					className="h-14 rounded-lg border border-ink/20 bg-paper text-[17px] font-semibold disabled:text-ink-soft/40"
				>
					이전
				</button>
				<button
					type="button"
					onClick={() => (isLast ? finish() : go(index + 1))}
					className="h-14 rounded-lg bg-primary text-[17px] font-bold text-primary-foreground active:brightness-95"
				>
					{isLast ? "다 만들었어요" : "다음 단계"}
				</button>
			</div>
			)}
		</div>,
		document.body
	)
}
