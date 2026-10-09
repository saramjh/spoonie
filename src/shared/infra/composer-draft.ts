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
  revision?: number
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

// Concurrent tabs must never silently overwrite the same draft.
// Read and compare the revision inside the *same* IndexedDB transaction.
export async function writeComposerDraft<T>(
  key: string, draft: ComposerDraft<T>, expectedRevision = 0,
): Promise<number> {
  const db = await openDrafts()
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => {
        const previous = request.result as ComposerDraft<T> | undefined
        if ((previous?.revision ?? 0) !== expectedRevision) {
          tx.abort()
          reject(new Error("다른 탭에서 이 글의 임시 저장본이 변경됐습니다. 내용을 복사한 뒤 다시 열어 주세요."))
          return
        }
        store.put({ ...draft, revision: expectedRevision + 1 }, key)
      }
      tx.oncomplete = () => resolve(expectedRevision + 1)
      tx.onerror = () => reject(tx.error || new Error("임시 저장에 실패했습니다."))
      tx.onabort = () => reject(tx.error || new Error("임시 저장이 중단됐습니다."))
    })
  } finally {
    db.close()
  }
}

export async function deleteComposerDraft(key: string, expectedRevision?: number): Promise<void> {
  if (expectedRevision === undefined) {
    await transact("readwrite", (store) => store.delete(key))
    return
  }
  const db = await openDrafts()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)
      request.onsuccess = () => {
        const previous = request.result as ComposerDraft<unknown> | undefined
        if ((previous?.revision ?? 0) !== expectedRevision) {
          tx.abort()
          reject(new Error("다른 탭에 더 최신 임시 저장본이 있어 삭제하지 않았습니다."))
          return
        }
        store.delete(key)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error("임시 저장 삭제 실패"))
      tx.onabort = () => reject(tx.error || new Error("임시 저장 삭제 중단"))
    })
  } finally {
    db.close()
  }
}
