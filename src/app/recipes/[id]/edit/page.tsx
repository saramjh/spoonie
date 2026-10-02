"use client"

import { useParams } from "next/navigation"
import RecipeForm from "@/components/recipe/RecipeForm"
import { useEditInitialData } from "@/hooks/useEditInitialData"
import { useNavigation } from "@/hooks/useNavigation"
import { PageLoading } from "@/components/kit"
import DetailStateMessage from "@/components/common/DetailStateMessage"

export default function RecipeEditPage() {
	const params = useParams()
	const itemId = params.id as string
	const { navigateBack } = useNavigation()
	const { initialData, isLoading, error, hasItem } = useEditInitialData(itemId)

	if (isLoading) return <PageLoading />

	if (error && !hasItem) {
		console.error("RecipeForm edit: error loading item", itemId, error)
		return <DetailStateMessage title="레시피를 찾을 수 없어요" body="이미 삭제되었거나 고칠 수 없는 글이에요." link={{ href: "/", label: "홈으로" }} />
	}

	if (!initialData) return <PageLoading />

	if (initialData.item_type !== "recipe") {
		return <DetailStateMessage title="다른 종류의 글이에요" body="이 화면에서는 레시피만 고칠 수 있어요." link={{ href: "/", label: "홈으로" }} />
	}

	return <RecipeForm initialData={initialData} onNavigateBack={navigateBack} />
}
