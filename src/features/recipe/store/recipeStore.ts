import { create } from "zustand"

type ViewMode = "card" | "list"
type SortOrder = "asc" | "desc"
type Tab = "my_recipes" | "all_recipes"

// 각 탭별 상태
interface TabState {
	sortBy: string
	sortOrder: SortOrder
	searchTerm: string
	filterCategory: string
	filterColorLabel: string
}

interface RecipeState {
	// 공통 상태
	viewMode: ViewMode
	currentTab: Tab

	// 탭별 독립 상태
	myRecipes: TabState
	allRecipes: TabState

	// Actions
	setViewMode: (mode: ViewMode) => void
	setCurrentTab: (tab: Tab) => void

	// 현재 탭의 상태를 가져오는 헬퍼
	getCurrentTabState: () => TabState

	// 현재 탭의 상태를 업데이트하는 액션들
	setSortBy: (by: string) => void
	setSortOrder: (order: SortOrder) => void
	setSearchTerm: (term: string) => void
	setFilterCategory: (category: string) => void
	setFilterColorLabel: (label: string) => void
	resetCurrentTabFilters: () => void

	// 특정 탭의 상태를 직접 업데이트하는 액션들
	updateTabState: (tab: Tab, updates: Partial<TabState>) => void
}

const defaultTabState: TabState = {
	sortBy: "created_at",
	sortOrder: "desc",
	searchTerm: "",
	filterCategory: "",
	filterColorLabel: "",
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
	// 초기 상태
	viewMode: "card",
	currentTab: "my_recipes",
	myRecipes: { ...defaultTabState },
	allRecipes: { ...defaultTabState },

	// 공통 액션들
	setViewMode: (mode) => set({ viewMode: mode }),
	setCurrentTab: (tab) => set({ currentTab: tab }),

	// 현재 탭 상태 가져오기
	getCurrentTabState: () => {
		const state = get()
		return state.currentTab === "my_recipes" ? state.myRecipes : state.allRecipes
	},

	// 현재 탭 상태 업데이트 액션들
	setSortBy: (by) => {
		const state = get()
		if (state.currentTab === "my_recipes") {
			set({ myRecipes: { ...state.myRecipes, sortBy: by } })
		} else {
			set({ allRecipes: { ...state.allRecipes, sortBy: by } })
		}
	},

	setSortOrder: (order) => {
		const state = get()
		if (state.currentTab === "my_recipes") {
			set({ myRecipes: { ...state.myRecipes, sortOrder: order } })
		} else {
			set({ allRecipes: { ...state.allRecipes, sortOrder: order } })
		}
	},

	setSearchTerm: (term) => {
		const state = get()
		if (state.currentTab === "my_recipes") {
			set({ myRecipes: { ...state.myRecipes, searchTerm: term } })
		} else {
			set({ allRecipes: { ...state.allRecipes, searchTerm: term } })
		}
	},

	setFilterCategory: (category) => {
		const state = get()
		if (state.currentTab === "my_recipes") {
			set({ myRecipes: { ...state.myRecipes, filterCategory: category } })
		} else {
			set({ allRecipes: { ...state.allRecipes, filterCategory: category } })
		}
	},

	setFilterColorLabel: (label) => {
		const state = get()
		if (state.currentTab === "my_recipes") {
			set({ myRecipes: { ...state.myRecipes, filterColorLabel: label } })
		} else {
			set({ allRecipes: { ...state.allRecipes, filterColorLabel: label } })
		}
	},

	resetCurrentTabFilters: () => {
		const state = get()
		const resetState = { ...defaultTabState }
		if (state.currentTab === "my_recipes") {
			set({ myRecipes: resetState })
		} else {
			set({ allRecipes: resetState })
		}
	},

	// 특정 탭 상태 직접 업데이트
	updateTabState: (tab, updates) => {
		const state = get()
		if (tab === "my_recipes") {
			set({ myRecipes: { ...state.myRecipes, ...updates } })
		} else {
			set({ allRecipes: { ...state.allRecipes, ...updates } })
		}
	},
}))
