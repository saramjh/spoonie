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

export interface FeedItem {
	id: string
	item_id: string // Alias for id for compatibility
	user_id: string
	item_type: ItemType
	created_at: string
	title: string | null
	content: string | null
	description: string | null
	image_urls: string[] | null
	tags: string[] | null
	is_public: boolean
	color_label: string | null
	servings: number | null
	cooking_time_minutes: number | null
	recipe_id: string | null
	cited_recipe_ids: string[] | null // Add cited_recipe_ids field from database

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

	// Additional fields for compatibility
	recipe_uuid?: string // Legacy field, maps to recipe_id
}

// Extended interface for detailed views
export interface ItemDetail extends FeedItem {
	steps?: RecipeStep[] // For RecipeContentView compatibility
	comments_data?: Comment[] // Alternative field name
}
