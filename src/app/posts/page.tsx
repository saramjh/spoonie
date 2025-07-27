import { createSupabaseServerClient } from "@/lib/supabase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import FeedList from "@/components/feed/FeedList"
import Image from "next/image"

export default async function FeedPage() {
	const supabase = createSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return (
			<div className="container mx-auto max-w-2xl py-12 text-center">
				<p>피드를 보려면 로그인이 필요합니다.</p>
				<Button asChild className="mt-4">
					<Link href="/login">로그인</Link>
				</Button>
			</div>
		)
	}

	// 사용자가 팔로우하는 사람들의 ID 목록 가져오기
	const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", user.id)

	const followingIds = followingData?.map((follow) => follow.following_id) || []

	const recommendedRecipes = [
		{
			id: "1",
			title: "간단한 아침 샌드위치",
			imageUrl: "/images/sandwich.jpg", // 실제 이미지 경로로 변경 필요
			tags: ["간단한", "아침", "샌드위치"],
		},
		{
			id: "2",
			title: "건강한 닭가슴살 샐러드",
			imageUrl: "/images/salad.jpg", // 실제 이미지 경로로 변경 필요
			tags: ["다이어트", "점심", "샐러드"],
		},
		{
			id: "3",
			title: "매콤한 김치찌개",
			imageUrl: "/images/kimchijjigae.jpg", // 실제 이미지 경로로 변경 필요
			tags: ["한식", "저녁", "얼큰한"],
		},
		{
			id: "4",
			title: "달콤한 팬케이크",
			imageUrl: "/images/pancake.jpg", // 실제 이미지 경로로 변경 필요
			tags: ["디저트", "간식", "달콤한"],
		},
	];

	return (
		<div className="container mx-auto max-w-2xl py-6">
			{/* 오늘의 추천 / 맞춤 레시피 섹션 */}
			<section className="mb-8">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-gray-900">{user.user_metadata.full_name || user.email?.split('@')[0]}님을 위한 추천 레시피</h2>
					<Link href="/recipes" className="text-sm text-orange-500 font-semibold">더보기</Link>
				</div>
				<div className="flex overflow-x-auto space-x-4 pb-2 scrollbar-hide">
					{recommendedRecipes.map((recipe) => (
						<Link href={`/recipes/${recipe.id}`} key={recipe.id} className="flex-shrink-0 w-48">
							<div className="bg-white rounded-xl shadow-md overflow-hidden">
								<Image
									src={recipe.imageUrl}
									alt={recipe.title}
									width={192}
									height={120}
									className="w-full h-32 object-cover"
								/>
								<div className="p-3">
									<h3 className="font-semibold text-gray-800 text-sm line-clamp-1">{recipe.title}</h3>
									<div className="flex flex-wrap gap-1 mt-1">
										{recipe.tags.map((tag, index) => (
											<span key={index} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
												#{tag}
											</span>
										))}
									</div>
								</div>
							</div>
						</Link>
					))}
				</div>
			</section>

			<FeedList initialUser={user} initialFollowingIds={followingIds} />
		</div>
	)
}
