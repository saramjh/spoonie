import { describe, expect, it, vi } from "vitest"
import { cleanupUncommittedImages } from "./item-images"

function client() {
  const removed: string[] = []
  let failRemoval = false
  const supabase = {
    storage: {
      from: () => ({
        async remove(paths: string[]) {
          removed.push(...paths)
          return { error: failRemoval ? new Error("storage disconnected") : null }
        },
      }),
    },
  } as unknown as Parameters<typeof cleanupUncommittedImages>[2]
  return { supabase, removed, fail: () => { failRemoval = true } }
}

describe("cleanupUncommittedImages", () => {
  const own = "https://example.test/storage/v1/object/public/item-images/author/new.jpg"
  const prior = "https://example.test/storage/v1/object/public/item-images/author/published.jpg"

  it("releases new source and variants if no database write has started", async () => {
    const { supabase, removed } = client()
    await cleanupUncommittedImages([own], { dbSaveStarted: false, dbCommitted: false, error: new Error("step upload failed") }, supabase)
    expect(removed).toEqual([
      "author/new.jpg", "author/new.jpg.w400.jpg", "author/new.jpg.w800.jpg",
    ])
    expect(removed).not.toContain("author/published.jpg")
  })

  it("never deletes photos after a committed database write", async () => {
    const { supabase, removed } = client()
    await cleanupUncommittedImages([own, prior], { dbSaveStarted: true, dbCommitted: true, error: new Error("cache failure") }, supabase)
    expect(removed).toEqual([])
  })

  it("removes new photos after a confirmed SQLSTATE database rejection", async () => {
    const { supabase, removed } = client()
    const error = new Error("recipe write rejected", { cause: { code: "23505" } })
    await cleanupUncommittedImages([own], { dbSaveStarted: true, dbCommitted: false, error }, supabase)
    expect(removed).toContain("author/new.jpg")
  })

  it("keeps photos when the database write outcome is unknown", async () => {
    const { supabase, removed } = client()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    await cleanupUncommittedImages([own], { dbSaveStarted: true, dbCommitted: false, error: new TypeError("Failed to fetch") }, supabase)
    expect(removed).toEqual([])
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it("keeps photos after ambiguous PostgREST errors without SQLSTATE", async () => {
    const { supabase, removed } = client()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    await cleanupUncommittedImages([own], { dbSaveStarted: true, dbCommitted: false, error: new Error("postgrest failure", { cause: { code: "PGRST301" } }) }, supabase)
    expect(removed).toEqual([])
    warn.mockRestore()
  })

  it("preserves the primary save failure when storage cleanup fails", async () => {
    const { supabase, fail } = client()
    fail()
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("post write rejected", { cause: { code: "42501" } })
    await expect(cleanupUncommittedImages([own], { dbSaveStarted: true, dbCommitted: false, error }, supabase)).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })
})
