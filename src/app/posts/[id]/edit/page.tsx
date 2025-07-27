import PostForm from "@/components/feed/PostForm" // ItemForm 대신 PostForm 임포트
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { notFound } from "next/navigation"

export default async function PostEditPage({ params }: { params: { id: string } }) {
	const supabase = createSupabaseServerClient()
	const { data: post, error } = await supabase
		.from("items")
		.select("*, profiles!items_user_id_fkey(*)") // 관계 명시
		.eq("id", params.id)
		.eq("item_type", "post")
		.single()

	if (error) {
		console.error("PostEditPage: Supabase query error:", error)
		notFound()
	}

	if (!post) {
		notFound()
	}

	return <PostForm isEditMode={true} initialData={post} />
}
