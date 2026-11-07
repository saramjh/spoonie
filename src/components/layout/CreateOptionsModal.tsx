"use client"

import { useRouter } from "@/shared/lib/navigation"
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { BookOpen, Camera, ChevronRight, X } from "lucide-react"

interface CreateOptionsModalProps {
	isOpen: boolean
	onClose: () => void
}

export default function CreateOptionsModal({ isOpen, onClose }: CreateOptionsModalProps) {
	const router = useRouter()

	const handleNavigation = (path: string) => {
		router.push(path)
		onClose()
	}

	// 레시피가 자산이고 레시피드는 그 위의 활동이다 (DESIGN.md Interface Grammar 1, 6).
	// 레시피를 첫 번째 주요 행동으로 두고, 레시피드는 "레시피 화면에서 남기면 이어진다"는 경로를 함께 알려 준다.
	return (
		<Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground={false}>
			<DrawerContent className="mx-auto max-w-md px-4 pb-6 pt-4">
				<div className="flex items-center justify-between">
					<DrawerTitle className="text-title font-semibold text-ink">무엇을 남길까요?</DrawerTitle>
					<Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="닫기">
						<X className="h-5 w-5" aria-hidden />
					</Button>
				</div>
				<DrawerDescription className="sr-only">레시피 또는 레시피드를 선택해 작성해요.</DrawerDescription>
				<div className="mt-3 divide-y divide-border border-y border-border">
					<button type="button" onClick={() => handleNavigation("/recipes/new")}
						className="flex min-h-24 w-full items-center gap-3 py-4 text-left text-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						<BookOpen className="h-5 w-5 shrink-0" aria-hidden />
						<span className="min-w-0 flex-1">
							<span className="block text-heading">레시피 쓰기</span>
							<span className="mt-1 block text-caption text-ink-soft">재료와 만드는 법을 기록해 두고 요리할 때 다시 꺼내 봐요.</span>
						</span>
						<ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
					</button>
					<button type="button" onClick={() => handleNavigation("/posts/new")}
						className="flex min-h-24 w-full items-center gap-3 py-4 text-left text-ink hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						<Camera className="h-5 w-5 shrink-0" aria-hidden />
						<span className="min-w-0 flex-1">
							<span className="block text-heading">레시피드 쓰기</span>
							<span className="mt-1 block text-caption text-ink-soft">사진과 글로 요리·주방·식생활 이야기를 남겨요.</span>
						</span>
						<ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden />
					</button>
				</div>
				<p className="mt-4 text-caption leading-relaxed text-ink-soft">
					다른 사람의 레시피로 만들었다면 그 레시피에서 만든 기록을 남겨 주세요. 원래 레시피와 이어져요.
				</p>
			</DrawerContent>
		</Drawer>
	)
}
