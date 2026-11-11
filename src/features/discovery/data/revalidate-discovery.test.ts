import { afterEach, describe, expect, it, vi } from "vitest"
import { revalidatePath } from "next/cache"
import { revalidateProfilePaths, revalidateDiscoveryPaths } from "./revalidate-discovery"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
afterEach(() => vi.clearAllMocks())

describe("editorial curator profile cache", () => {
  it("invalidates the curator directory whenever official profile data changes", () => {
    revalidateProfilePaths(["235df2cb"])
    expect(revalidatePath).toHaveBeenCalledWith("/curators")
    expect(revalidatePath).toHaveBeenCalledWith("/profile/235df2cb")
  })
  it("also invalidates the curator directory on an authorized public Recipe release", () => {
    revalidateDiscoveryPaths({ itemId: "6eaa37a1-6c0f-4841-aadd-7a2d980fbdbf", profileIds:["235df2cb"] })
    expect(revalidatePath).toHaveBeenCalledWith("/curators")
    expect(revalidatePath).toHaveBeenCalledWith("/recipes/6eaa37a1-6c0f-4841-aadd-7a2d980fbdbf")
  })
})
