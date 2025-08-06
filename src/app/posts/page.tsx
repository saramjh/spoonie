import PostsPageClient from "./PostsPageClient"

// ✅ Server Component에서는 쿠키 수정 없이 Client Component로 위임
export default function FeedPage() {
	return <PostsPageClient />
}
