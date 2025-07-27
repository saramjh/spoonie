import { createSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface RecipeData {
	id: string;
	image_urls: string[] | null;
	instructions: { image_url?: string }[] | null;
}

interface PostData {
	id: string;
	image_urls: string[] | null;
}

export async function POST(request: Request) {
	const { userId } = await request.json();

	if (!userId) {
		return NextResponse.json({ error: "User ID is required" }, { status: 400 });
	}

	const supabase = createSupabaseServerClient();

	try {
		// 1. 사용자 프로필 이미지 삭제
		const { data: userProfile, error: userProfileError } = await supabase.from("profiles").select("avatar_url").eq("id", userId).single();

		if (userProfileError) {
			console.error("Error fetching user profile for deletion:", userProfileError.message);
		}

		if (userProfile?.avatar_url) {
			const avatarPath = userProfile.avatar_url.split("/avatars/")[1];
			if (avatarPath) {
				await supabase.storage.from("avatars").remove([avatarPath]);
			}
		}

		// 2. 사용자 레시피 이미지 및 조리법 이미지 삭제
		const { data: userRecipes, error: userRecipesError } = (await supabase.from("recipes").select("id, image_urls, instructions").eq("user_id", userId)) as { data: RecipeData[] | null; error: any };

		if (userRecipesError) {
			console.error("Error fetching user recipes for deletion:", userRecipesError.message);
		}

		if (userRecipes && userRecipes.length > 0) {
			const filesToDelete: string[] = [];
			userRecipes.forEach((recipe) => {
				if (recipe.image_urls && recipe.image_urls.length > 0) {
					recipe.image_urls.forEach((url: string) => {
						const path = url.split("/item-images/")[1];
						if (path) filesToDelete.push(`item-images/${path}`);
					});
				}
				if (recipe.instructions && Array.isArray(recipe.instructions)) {
					recipe.instructions.forEach((instruction: Record<string, unknown>) => {
						if (instruction.image_url) {
							const path = (instruction.image_url as string).split("/item-images/")[1];
							if (path) filesToDelete.push(`item-images/${path}`);
						}
					});
				}
			});

			if (filesToDelete.length > 0) {
				await supabase.storage.from("item-images").remove(filesToDelete);
			}
		}

		// 3. 사용자 게시물 이미지 삭제
		const { data: userPosts, error: userPostsError } = (await supabase.from("posts").select("id, image_urls").eq("user_id", userId)) as { data: PostData[] | null; error: any };

		if (userPostsError) {
			console.error("Error fetching user posts for deletion:", userPostsError.message);
		}

		if (userPosts && userPosts.length > 0) {
			const postImagePaths: string[] = [];
			userPosts.forEach((post) => {
				if (post.image_urls && post.image_urls.length > 0) {
					post.image_urls.forEach((url: string) => {
						const path = url.split("/post-images/")[1];
						if (path) postImagePaths.push(`post-images/${path}`);
					});
				}
			});

			if (postImagePaths.length > 0) {
				await supabase.storage.from("post-images").remove(postImagePaths);
			}
		}

		// 4. 데이터베이스에서 사용자 관련 데이터 및 인증 정보 삭제
		const { error: deleteDataError } = await supabase.rpc("delete_user_data", { user_id_to_delete: userId });

		if (deleteDataError) {
			console.error("Error deleting user data from database:", deleteDataError.message);
			return NextResponse.json({ error: deleteDataError.message }, { status: 500 });
		}

		return NextResponse.json({ message: "User and associated data deleted successfully" }, { status: 200 });
	} catch (error: any) {
		console.error("Unhandled error during user deletion:", error.message);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
