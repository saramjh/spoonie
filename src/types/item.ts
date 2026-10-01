export type ItemType = "post" | "recipe"

export interface Profile {
	id: string // Added id field to match database
	user_id?: string // Keep for backward compatibility
	public_id: string // Match database schema
	username: string // Required in database
	display_name: string | null
	avatar_url: string | null
	email?: string | null // Kept for fallback
	user_email?: string | null // Kept for fallback
	user_public_id?: string | null // Kept for fallback
	bio?: string | null // Add bio field from database
}

export interface Comment {
	id: string
	content: string
	created_at: string
	user_id: string
	parent_comment_id?: string | null
	user: Profile
	is_deleted?: boolean
}

export interface Ingredient {
	name: string
	amount: number // Match database numeric type
	unit: string
	order_index?: number // 재료 순서 (드래그앤드롭 지원)
}

export interface Instruction {
	step_number: number
	description: string
	image_url?: string // Add image_url field
}

// Recipe step interface for display compatibility
export interface RecipeStep {
	step_number: number
	description: string
	image_url?: string
	order?: number // Alias for step_number for compatibility
}

export interface Item {
	id: string
	item_id: string // Alias for id for compatibility
	user_id: string
	item_type: ItemType
	created_at: string
	title: string | null
	content: string | null
	description: string | null
	image_urls: string[] | null
	thumbnail_index: number | null
	tags: string[] | null
	is_public: boolean
	color_label: string | null
	servings: number | null
	cooking_time_minutes: number | null
	recipe_id: string | null
	cited_recipe_ids: string[] | null // Add cited_recipe_ids field from database
	creation_origin?: "recipe_detail" | "cook_mode" | "fork" | "manual" | null // 작성 경로 (관계 종류를 정한다)
	made_count?: number // 다른 사람이 이 레시피로 만든 공개 기록 수 (사람 수, optimized_feed_view)
	continued_count?: number // 이 레시피에서 이어진 공개 레시피 수
	made_thumbs?: string[] // 만든 기록의 사진 최대 3장
	ingredient_count?: number // 레시피 재료 수 (optimized_feed_view)
	key_ingredients?: string[] // 재료 목록의 앞 3개: 피드 카드에서 레시피를 레시피답게 보이게 한다

	// User/Author information (joined from profiles)
	author?: Profile
	display_name?: string | null
	username?: string
	avatar_url?: string | null
	user_public_id?: string | null

	// Recipe-specific fields
	ingredients?: Ingredient[]
	instructions?: Instruction[]

	// Social interaction fields
	likes_count: number
	comments_count: number
	is_liked: boolean
	is_following: boolean
	comments?: Comment[]
	
	// Bookmark fields
	bookmarks_count?: number
	is_bookmarked?: boolean

	// Additional fields for compatibility
	recipe_uuid?: string // Legacy field, maps to recipe_id
}



// Extended interface for detailed views
export interface ItemDetail extends Item {
	steps?: RecipeStep[] // For RecipeContentView compatibility
	comments_data?: Comment[] // Alternative field name
}
