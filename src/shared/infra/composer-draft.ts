import type { OptimizedImage } from "@/shared/infra/image-utils"

// 작성 중인 파일은 URL 문자열이 아닌 실제 Blob/File로 보관한다.
// blob: 미리보기 주소는 새로고침 후 유효하지 않으므로 복원 시 다시 만든다.
export interface StoredImage {
  file: File
  width: number
  height: number
  existingUrl?: string
}

export interface ComposerDraft<T> {
  values: T
  mainImages: StoredImage[]
  instructionImages: (StoredImage | null)[]
  thumbnailIndex: number
  savedAt: number
}

const DB_NAME = "spoonie-composer"
const STORE_NAME = "drafts"

export function packImage(image: OptimizedImage): StoredImage {
  return {
    file: image.file,
    width: image.width,
    height: image.height,
    ...(image.file.size === 0 ? { existingUrl: image.preview } : {}),
  }
}

export function unpackImage(image: StoredImage): OptimizedImage {
  const blob: Blob = image.file
  const file = blob instanceof File
    ? blob
    : new File([blob], "recovered.jpg", { type: blob.type || "image/jpeg" })
  return {
    file,
    width: image.width,
    height: image.height,
    preview: image.existingUrl ?? URL.createObjectURL(file),
  }
}

async function openDrafts(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error("작성 임시 저장소를 열 수 없습니다."))
  })
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDrafts()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const request = run(tx.objectStore(STORE_NAME))
      let value: T
      request.onsuccess = () => { value = request.result }
      tx.oncomplete = () => resolve(value)
      tx.onerror = () => reject(tx.error || new Error("임시 저장에 실패했습니다."))
      tx.onabort = () => reject(tx.error || new Error("임시 저장이 중단됐습니다."))
    })
  } finally {
    db.close()
  }
}

export async function readComposerDraft<T>(key: string): Promise<ComposerDraft<T> | undefined> {
  return transact("readonly", (store) => store.get(key))
}

export async function writeComposerDraft<T>(key: string, draft: ComposerDraft<T>): Promise<void> {
  await transact("readwrite", (store) => store.put(draft, key))
}

export async function deleteComposerDraft(key: string): Promise<void> {
  await transact("readwrite", (store) => store.delete(key))
}
