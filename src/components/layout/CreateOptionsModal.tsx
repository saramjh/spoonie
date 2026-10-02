"use client"

import { useRouter } from "@/lib/navigation"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { BookPlus, ImagePlus } from "lucide-react"

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
		<Drawer open={isOpen} onOpenChange={onClose}>
			<DrawerContent className="focus:outline-none sm:mx-auto sm:max-w-md">
				<div className="mx-auto w-full">
					<DrawerHeader className="text-left">
						<DrawerTitle>무엇을 남길까요?</DrawerTitle>
					</DrawerHeader>
					<div className="space-y-2 px-4">
						<button
							type="button"
							onClick={() => handleNavigation("/recipes/new")}
							className="flex w-full items-center gap-4 rounded-lg bg-primary px-4 py-4 text-left text-primary-foreground active:brightness-95"
						>
							<BookPlus className="h-7 w-7 flex-shrink-0" aria-hidden />
							<span>
								<span className="block text-heading">레시피 쓰기</span>
								<span className="block text-label">재료와 단계를 기록해 두고 요리할 때 다시 꺼내 봐요.</span>
							</span>
						</button>
						<button
							type="button"
							onClick={() => handleNavigation("/posts/new")}
							className="flex w-full items-center gap-4 rounded-lg border border-ink/20 bg-paper px-4 py-4 text-left text-ink active:bg-muted"
						>
							<ImagePlus className="h-7 w-7 flex-shrink-0 text-ink-soft" aria-hidden />
							<span>
								<span className="block text-heading">레시피드 쓰기</span>
								<span className="block text-meta text-ink-soft">사진과 글로 요리 이야기를 남겨요.</span>
							</span>
						</button>
						<p className="px-1 pt-1 text-meta text-ink-soft">
							다른 사람의 레시피로 만들었다면 그 레시피 화면의 &lsquo;이 레시피로 만들었어요&rsquo;로 남겨 주세요. 원래 레시피와 이어지고 작성자에게도 알려져요.
						</p>
					</div>
					<div className="p-4">
						<Button onClick={onClose} variant="ghost" className="w-full">
							닫기
						</Button>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	)
}
