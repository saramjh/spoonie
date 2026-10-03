// Supabase가 DB에서 자동 생성한 타입 (Supabase MCP generate_typescript_types, 2026-10-03).
// 손으로 고치지 않는다. DB를 바꾸면 다시 생성해 통째로 덮어쓴다.
// 화면·도메인 코드는 이 파일을 직접 쓰지 않고, features/*/contracts.ts의 별칭을 거친다.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      adjectives: {
        Row: {
          id: number
          word: string
        }
        Insert: {
          id?: number
          word: string
        }
        Update: {
          id?: number
          word?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "bookmarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "bookmarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          item_id: string
          parent_comment_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          item_id: string
          parent_comment_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          item_id?: string
          parent_comment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_relations: {
        Row: {
          created_at: string
          from_item_id: string
          origin: string | null
          relation_type: string
          to_recipe_id: string
        }
        Insert: {
          created_at?: string
          from_item_id: string
          origin?: string | null
          relation_type: string
          to_recipe_id: string
        }
        Update: {
          created_at?: string
          from_item_id?: string
          origin?: string | null
          relation_type?: string
          to_recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_relations_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "content_relations_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "content_relations_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_relations_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_relations_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_relations_to_recipe_id_fkey"
            columns: ["to_recipe_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "content_relations_to_recipe_id_fkey"
            columns: ["to_recipe_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "content_relations_to_recipe_id_fkey"
            columns: ["to_recipe_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_relations_to_recipe_id_fkey"
            columns: ["to_recipe_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_relations_to_recipe_id_fkey"
            columns: ["to_recipe_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: number
          item_id: string | null
          origin: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          item_id?: string | null
          origin?: string | null
          type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          item_id?: string | null
          origin?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          amount: number | null
          id: string
          item_id: string
          name: string
          order_index: number
          unit: string | null
        }
        Insert: {
          amount?: number | null
          id?: string
          item_id: string
          name: string
          order_index?: number
          unit?: string | null
        }
        Update: {
          amount?: number | null
          id?: string
          item_id?: string
          name?: string
          order_index?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
        ]
      }
      instructions: {
        Row: {
          description: string
          id: string
          image_url: string | null
          item_id: string
          step_number: number
        }
        Insert: {
          description: string
          id?: string
          image_url?: string | null
          item_id: string
          step_number: number
        }
        Update: {
          description?: string
          id?: string
          image_url?: string | null
          item_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "instructions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "instructions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "instructions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instructions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          cited_recipe_ids: string[] | null
          color_label: string | null
          content: string | null
          cooking_time_minutes: number | null
          created_at: string
          creation_origin: string | null
          description: string | null
          id: string
          image_urls: string[] | null
          is_public: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          recipe_id: string | null
          servings: number | null
          tags: string[] | null
          thumbnail_index: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cited_recipe_ids?: string[] | null
          color_label?: string | null
          content?: string | null
          cooking_time_minutes?: number | null
          created_at?: string
          creation_origin?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_public?: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          recipe_id?: string | null
          servings?: number | null
          tags?: string[] | null
          thumbnail_index?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cited_recipe_ids?: string[] | null
          color_label?: string | null
          content?: string | null
          cooking_time_minutes?: number | null
          created_at?: string
          creation_origin?: string | null
          description?: string | null
          id?: string
          image_urls?: string[] | null
          is_public?: boolean
          item_type?: Database["public"]["Enums"]["item_type"]
          recipe_id?: string | null
          servings?: number | null
          tags?: string[] | null
          thumbnail_index?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string
          from_user_id: string | null
          id: string
          is_read: boolean
          item_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          item_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          item_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nouns: {
        Row: {
          id: number
          word: string
        }
        Insert: {
          id?: number
          word: string
        }
        Update: {
          id?: number
          word?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_profile_public: boolean | null
          profile_message: string | null
          public_id: string | null
          role: string | null
          show_follower_count: boolean | null
          show_join_date: boolean | null
          updated_at: string | null
          username: string
          username_changed_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          is_profile_public?: boolean | null
          profile_message?: string | null
          public_id?: string | null
          role?: string | null
          show_follower_count?: boolean | null
          show_join_date?: boolean | null
          updated_at?: string | null
          username: string
          username_changed_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_profile_public?: boolean | null
          profile_message?: string | null
          public_id?: string | null
          role?: string | null
          show_follower_count?: boolean | null
          show_join_date?: boolean | null
          updated_at?: string | null
          username?: string
          username_changed_count?: number | null
        }
        Relationships: []
      }
      release_queue: {
        Row: {
          created_at: string
          item_id: string
          release_order: number
          released_at: string | null
        }
        Insert: {
          created_at?: string
          item_id: string
          release_order: number
          released_at?: string | null
        }
        Update: {
          created_at?: string
          item_id?: string
          release_order?: number
          released_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "release_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "release_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_queue_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
        ]
      }
      search_keywords: {
        Row: {
          created_at: string | null
          id: number
          keyword: string
          search_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          keyword: string
          search_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          keyword?: string
          search_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_push_settings: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          subscription_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          subscription_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          subscription_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      item_stats: {
        Row: {
          comments_count: number | null
          created_at: string | null
          item_id: string | null
          item_type: Database["public"]["Enums"]["item_type"] | null
          likes_count: number | null
        }
        Relationships: []
      }
      item_stats_with_bookmarks: {
        Row: {
          bookmarks_count: number | null
          comments_count: number | null
          created_at: string | null
          item_id: string | null
          item_type: Database["public"]["Enums"]["item_type"] | null
          likes_count: number | null
        }
        Relationships: []
      }
      optimized_feed_view: {
        Row: {
          avatar_url: string | null
          cited_recipe_ids: string[] | null
          color_label: string | null
          comments_count: number | null
          content: string | null
          continued_count: number | null
          cooking_time_minutes: number | null
          created_at: string | null
          creation_origin: string | null
          description: string | null
          display_name: string | null
          id: string | null
          image_urls: string[] | null
          ingredient_count: number | null
          is_liked: boolean | null
          is_public: boolean | null
          item_type: Database["public"]["Enums"]["item_type"] | null
          key_ingredients: string[] | null
          likes_count: number | null
          made_count: number | null
          made_thumbs: string[] | null
          recipe_id: string | null
          servings: number | null
          tags: string[] | null
          thumbnail_index: number | null
          title: string | null
          user_id: string | null
          user_public_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "item_stats"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "item_stats_with_bookmarks"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "optimized_feed_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "popular_items_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_items_view: {
        Row: {
          avatar_url: string | null
          comments_count: number | null
          content: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          image_urls: string[] | null
          item_type: Database["public"]["Enums"]["item_type"] | null
          likes_count: number | null
          popularity_score: number | null
          title: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_comment_atomic: {
        Args: {
          p_content: string
          p_item_id: string
          p_parent_comment_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      check_rls_policies: {
        Args: never
        Returns: {
          policy_name: string
          policy_type: string
          table_name: string
        }[]
      }
      delete_comment_atomic: {
        Args: { p_comment_id: string; p_item_id: string; p_user_id: string }
        Returns: Json
      }
      delete_user_data: {
        Args: { user_id_to_delete: string }
        Returns: undefined
      }
      generate_unique_public_id: { Args: never; Returns: string }
      get_acid_transaction_stats: {
        Args: never
        Returns: {
          avg_duration_ms: number
          operation_type: string
          success_rate: number
          total_calls: number
        }[]
      }
      get_explore: {
        Args: { made_limit?: number; recipe_limit?: number }
        Returns: Json
      }
      get_feed_items: {
        Args: { p_user_id: string; page_index: number; page_size: number }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          description: string
          display_name: string
          image_urls: string[]
          is_following: boolean
          is_liked: boolean
          item_id: string
          item_type: string
          likes_count: number
          recipe_id: string
          tags: string[]
          title: string
          user_email: string
          user_id: string
          view_count: number
        }[]
      }
      get_high_concurrency_items: {
        Args: { limit_count?: number }
        Returns: {
          activity_score: number
          comments_count: number
          item_id: string
          item_type: string
          likes_count: number
        }[]
      }
      get_item_comments: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: {
          avatar_url: string
          content: string
          created_at: string
          display_name: string
          id: string
          is_deleted: boolean
          user_id: string
        }[]
      }
      get_item_details: {
        Args: { p_item_id: string }
        Returns: {
          avatar_url: string
          comments_count: number
          comments_data: Json
          content: string
          created_at: string
          description: string
          display_name: string
          image_urls: Json
          ingredients: Json
          is_following: boolean
          is_liked: boolean
          item_id: string
          item_type: string
          likes_count: number
          post_id: string
          recipe_id: string
          recipe_uuid: string
          servings: number
          steps: Json
          tags: Json
          title: string
          user_email: string
          user_id: string
          user_public_id: string
          username: string
          view_count: number
        }[]
      }
      get_likes_statistics: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: Json
      }
      get_pending_like_notifications: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          item_id: string
          item_title: string
          item_type: string
          like_id: string
          liker_avatar: string
          liker_id: string
          liker_name: string
        }[]
      }
      get_popular_keywords: {
        Args: { p_limit: number }
        Returns: {
          keyword: string
          search_count: number
        }[]
      }
      get_popular_posts: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          description: string
          display_name: string
          image_urls: string[]
          item_id: string
          item_type: string
          likes_count: number
          recipe_id: string
          tags: string[]
          title: string
          user_email: string
          user_id: string
          view_count: number
        }[]
      }
      get_popular_tags: {
        Args: { limit_count?: number }
        Returns: {
          count: number
          keyword: string
        }[]
      }
      get_profile_lineage_counts: {
        Args: { profile_user_id: string }
        Returns: {
          adapted_count: number
          cooked_count: number
          recipes_count: number
          referenced_count: number
        }[]
      }
      get_recipe_activity: { Args: { recipe: string }; Returns: Json }
      get_user_follows_for_authors: {
        Args: { author_ids_param: string[]; user_id_param: string }
        Returns: {
          author_id: string
          is_following: boolean
        }[]
      }
      get_user_likes_for_items: {
        Args: { item_ids_param: string[]; user_id_param: string }
        Returns: {
          is_liked: boolean
          item_id: string
        }[]
      }
      get_user_recipes_with_accurate_stats: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          cited_recipe_ids: string[]
          color_label: string
          comments_count: number
          content: string
          cooking_time_minutes: number
          created_at: string
          description: string
          display_name: string
          id: string
          image_urls: string[]
          is_liked: boolean
          is_public: boolean
          item_type: string
          likes_count: number
          recipe_id: string
          servings: number
          tags: string[]
          thumbnail_index: number
          title: string
          user_id: string
          user_public_id: string
          username: string
        }[]
      }
      get_users_with_profiles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          nickname: string
        }[]
      }
      log_post_view: { Args: { p_post_id: string }; Returns: undefined }
      log_search_keyword: { Args: { p_keyword: string }; Returns: undefined }
      mark_like_notifications_sent: {
        Args: { p_like_ids: string[] }
        Returns: boolean
      }
      search_all_content: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          content: string
          created_at: string
          description: string
          display_name: string
          id: string
          image_urls: string[]
          item_type: string
          tags: string[]
          title: string
          user_id: string
          user_public_id: string
          username: string
        }[]
      }
      search_followed_recipes_advanced: {
        Args: { current_user_id: string; search_term: string }
        Returns: {
          id: string
        }[]
      }
      search_items_optimized: {
        Args: {
          current_user_id?: string
          max_results?: number
          search_term: string
        }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          display_name: string
          id: string
          image_urls: string[]
          is_following: boolean
          item_type: string
          likes_count: number
          relevance_score: number
          title: string
          user_id: string
          username: string
        }[]
      }
      search_posts_and_recipes: {
        Args: { p_keyword?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          comments_count: number
          content: string
          created_at: string
          description: string
          display_name: string
          image_urls: string[]
          item_id: string
          item_type: string
          likes_count: number
          recipe_id: string
          tags: string[]
          title: string
          user_email: string
          user_id: string
          view_count: number
        }[]
      }
      search_recipes_by_ingredient: {
        Args: { search_term: string }
        Returns: {
          id: string
        }[]
      }
      search_users: {
        Args: {
          current_user_id?: string
          max_results?: number
          search_term: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          is_following: boolean
          items_count: number
          user_id: string
          username: string
        }[]
      }
      soft_delete_comment: {
        Args: { comment_id_to_delete: string }
        Returns: undefined
      }
      test_item_exists: { Args: { p_item_id: string }; Returns: Json }
      toggle_like: {
        Args: { p_author_id?: string; p_item_id: string; p_item_type: string }
        Returns: Json
      }
      toggle_like_atomic: {
        Args: { p_author_id: string; p_item_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      item_type: "post" | "recipe"
    }
    CompositeTypes: {
      comment_data: {
        id: string | null
        content: string | null
        created_at: string | null
        user_id: string | null
        display_name: string | null
        avatar_url: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      item_type: ["post", "recipe"],
    },
  },
} as const
