import { afterEach, describe, expect, it, vi } from "vitest"
import { afterCommit } from "./post-commit"

afterEach(() => { vi.restoreAllMocks() })

describe("best-effort after database commit", () => {
  it("does not turn a saved item into a failed submission when cache update fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const steps: string[] = ["db-committed"]
    await afterCommit("cache", async () => {
      steps.push("cache-failed")
      throw new Error("browser cache disconnected")
    })
    await afterCommit("revalidate", async () => { steps.push("revalidated") })
    steps.push("navigated")
    expect(steps).toEqual(["db-committed", "cache-failed", "revalidated", "navigated"])
    expect(warn).toHaveBeenCalledOnce()
  })

  it("also catches synchronous errors from draft cleanup and allows later work", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    await expect(afterCommit("draft", () => { throw Error("IndexedDB denied") })).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
  })
})
