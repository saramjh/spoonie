// 임시 저장을 위한 유틸리티 (IndexedDB + localStorage fallback)

// 폼 데이터 타입 정의
interface RecipeFormData {
	title: string
	description?: string
	servings?: number
	cooking_time_minutes?: number
	is_public?: boolean
	ingredients?: Array<{ name: string; amount: number; unit: string }>
	instructions?: Array<{ description: string; image_url?: string }>
	color_label?: string | null
	tags?: string[]
	cited_recipe_ids?: string[]
}

interface PostFormData {
	title: string
	content: string
	tags?: string[]
	cited_recipe_ids?: string[]
}

export interface TempFormData {
	id: string
	type: "recipe" | "post"
	userId: string
	timestamp: number
	data: RecipeFormData | PostFormData
	images?: {
		preview: string
		file?: File
	}[]
}

const TEMP_STORAGE_KEY = "spoonie_temp_forms"
const DB_NAME = "SpoonieDB"
const DB_VERSION = 1
const STORE_NAME = "tempForms"

class TempStorageManager {
	private db: IDBDatabase | null = null

	async init(): Promise<void> {
		if (!("indexedDB" in window)) return

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION)

			request.onerror = () => reject(request.error)
			request.onsuccess = () => {
				this.db = request.result
				resolve()
			}

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
					store.createIndex("userId", "userId", { unique: false })
					store.createIndex("timestamp", "timestamp", { unique: false })
				}
			}
		})
	}

	async saveTempData(data: TempFormData): Promise<void> {
		// IndexedDB 시도
		if (this.db) {
			try {
				const transaction = this.db.transaction([STORE_NAME], "readwrite")
				const store = transaction.objectStore(STORE_NAME)
				await new Promise((resolve, reject) => {
					const request = store.put(data)
					request.onsuccess = () => resolve(request.result)
					request.onerror = () => reject(request.error)
				})
				console.log("✅ Temp data saved to IndexedDB:", data.id)
				return
			} catch (error) {
				console.warn("IndexedDB save failed, falling back to localStorage:", error)
			}
		}

		// localStorage fallback
		try {
			const existing = JSON.parse(localStorage.getItem(TEMP_STORAGE_KEY) || "[]")
			const index = existing.findIndex((item: TempFormData) => item.id === data.id)

			// 파일 데이터는 localStorage에 저장하지 않음
			const dataToSave = { ...data, images: data.images?.map((img) => ({ preview: img.preview })) }

			if (index >= 0) {
				existing[index] = dataToSave
			} else {
				existing.push(dataToSave)
			}

			// 최대 5개까지만 보관
			if (existing.length > 5) {
				existing.sort((a: TempFormData, b: TempFormData) => b.timestamp - a.timestamp)
				existing.splice(5)
			}

			localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(existing))
			console.log("✅ Temp data saved to localStorage:", data.id)
		} catch (error) {
			console.error("❌ Failed to save temp data:", error)
		}
	}

	async getTempData(userId: string): Promise<TempFormData[]> {
		// IndexedDB 시도
		if (this.db) {
			try {
				const transaction = this.db.transaction([STORE_NAME], "readonly")
				const store = transaction.objectStore(STORE_NAME)
				const index = store.index("userId")

				return new Promise((resolve, reject) => {
					const request = index.getAll(userId)
					request.onsuccess = () => {
						const results = request.result.sort((a, b) => b.timestamp - a.timestamp)
						resolve(results)
					}
					request.onerror = () => reject(request.error)
				})
			} catch (error) {
				console.warn("IndexedDB get failed, falling back to localStorage:", error)
			}
		}

		// localStorage fallback
		try {
			const existing = JSON.parse(localStorage.getItem(TEMP_STORAGE_KEY) || "[]")
			return existing.filter((item: TempFormData) => item.userId === userId).sort((a: TempFormData, b: TempFormData) => b.timestamp - a.timestamp)
		} catch (error) {
			console.error("❌ Failed to get temp data:", error)
			return []
		}
	}

	async deleteTempData(id: string): Promise<void> {
		// IndexedDB 시도
		if (this.db) {
			try {
				const transaction = this.db.transaction([STORE_NAME], "readwrite")
				const store = transaction.objectStore(STORE_NAME)
				await new Promise((resolve, reject) => {
					const request = store.delete(id)
					request.onsuccess = () => resolve(request.result)
					request.onerror = () => reject(request.error)
				})
				console.log("✅ Temp data deleted from IndexedDB:", id)
				return
			} catch (error) {
				console.warn("IndexedDB delete failed, falling back to localStorage:", error)
			}
		}

		// localStorage fallback
		try {
			const existing = JSON.parse(localStorage.getItem(TEMP_STORAGE_KEY) || "[]")
			const filtered = existing.filter((item: TempFormData) => item.id !== id)
			localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(filtered))
			console.log("✅ Temp data deleted from localStorage:", id)
		} catch (error) {
			console.error("❌ Failed to delete temp data:", error)
		}
	}

	async cleanOldData(maxAgeHours = 24): Promise<void> {
		const maxAge = Date.now() - maxAgeHours * 60 * 60 * 1000

		// IndexedDB 청소
		if (this.db) {
			try {
				const transaction = this.db.transaction([STORE_NAME], "readwrite")
				const store = transaction.objectStore(STORE_NAME)
				const index = store.index("timestamp")
				const range = IDBKeyRange.upperBound(maxAge)

				const request = index.openCursor(range)
				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest).result
					if (cursor) {
						cursor.delete()
						cursor.continue()
					}
				}
			} catch (error) {
				console.warn("IndexedDB cleanup failed:", error)
			}
		}

		// localStorage 청소
		try {
			const existing = JSON.parse(localStorage.getItem(TEMP_STORAGE_KEY) || "[]")
			const filtered = existing.filter((item: TempFormData) => item.timestamp > maxAge)
			localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(filtered))
		} catch (error) {
			console.error("❌ Failed to clean temp data:", error)
		}
	}
}

// 싱글톤 인스턴스
export const tempStorage = new TempStorageManager()

// 자동 초기화
if (typeof window !== "undefined") {
	tempStorage.init().then(() => {
		// 시작시 오래된 데이터 정리
		tempStorage.cleanOldData()
	})
}

// 유틸리티 함수들
export const generateTempId = (type: "recipe" | "post", userId: string): string => {
	return `${type}_${userId}_${Date.now()}`
}

export const debounce = <T extends (...args: never[]) => unknown>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
	let timeout: NodeJS.Timeout
	return (...args: Parameters<T>) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => func(...args), wait)
	}
}
