"use client"

import { useRouter } from "next/navigation"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
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

	return (
		<Drawer open={isOpen} onOpenChange={onClose}>
			<DrawerContent>
				<div className="mx-auto w-full max-w-sm">
					<DrawerHeader>
						<DrawerTitle>무엇을 만들까요?</DrawerTitle>
						<DrawerDescription>만들고 싶은 콘텐츠 종류를 선택해주세요.</DrawerDescription>
					</DrawerHeader>
					<div className="p-4 pb-0 space-y-4">
						<Button variant="outline" className="w-full justify-start p-6 text-left h-auto" onClick={() => handleNavigation("/recipes/new")}>
							<BookPlus className="mr-4 h-8 w-8 text-orange-500" />
							<div>
								<p className="font-semibold text-base">새 레시피 작성</p>
								<p className="text-sm text-gray-500">나만의 레시피를 꼼꼼하게 기록해요.</p>
							</div>
						</Button>
								<Button variant="outline" className="w-full justify-start p-6 text-left h-auto" onClick={() => handleNavigation("/posts/new")}>
			<ImagePlus className="mr-4 h-8 w-8 text-blue-500" />
			<div>
				<p className="font-semibold text-base">새 레시피드 작성</p>
				<p className="text-sm text-gray-500">사진과 함께 간단한 요리 일상을 공유해요.</p>
			</div>
		</Button>
					</div>
					<div className="mt-4 p-4">
						<Button onClick={onClose} variant="ghost" className="w-full">
							취소
						</Button>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	)
}
