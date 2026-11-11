import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
  listImages: vi.fn(),
  removeImages: vi.fn(),
  listAvatars: vi.fn(),
  removeAvatars: vi.fn(),
  events: [] as string[],
}))
vi.mock("@/shared/infra/supabase-server", () => ({
  createSupabaseRouteHandlerClient: async () => ({ auth: { getUser: mock.getUser }, rpc: mock.rpc }),
}))
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }))

import { POST } from "./route"

const userId = "241b0990-a6e9-4b18-bd14-410d9cc63a30"

const request = (userIdBody?: string) => new Request("https://spoonie.kr/api/delete-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(userIdBody ? { userId: userIdBody } : {}),
})

beforeEach(() => {
  vi.stubEnv("SUPABASE_SECRET_KEY", "mock-server-only-secret")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  mock.events.length = 0
  mock.getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null })
  mock.rpc.mockReset().mockImplementation(async () => { mock.events.push("delete-account"); return { error: null } })
  mock.listImages.mockReset()
    .mockResolvedValueOnce({ data: [], error: null }) // preflight
    .mockResolvedValueOnce({ data: [{ id: "image", name: "cover.jpg" }], error: null })
    .mockResolvedValueOnce({ data: [], error: null })
  mock.removeImages.mockReset().mockImplementation(async () => { mock.events.push("remove-images"); return { error: null } })
  mock.listAvatars.mockReset()
    .mockResolvedValueOnce({ data: [], error: null }) // preflight
    .mockResolvedValueOnce({ data: [
      { id: "avatar", name: userId + ".png" },
      { id: "other", name: "not-" + userId + ".png" },
    ], error: null })
  mock.removeAvatars.mockReset().mockImplementation(async () => { mock.events.push("remove-avatars"); return { error: null } })
  mock.createClient.mockReset().mockReturnValue({
    storage: {
      from(bucket: string) {
        return bucket === "item-images"
          ? { list: mock.listImages, remove: mock.removeImages }
          : { list: mock.listAvatars, remove: mock.removeAvatars }
      },
    },
  })
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("account deletion safety", () => {
  it("rejects unauthenticated and cross-account delete requests before any database or storage mutation", async () => {
    mock.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    expect((await POST(request())).status).toBe(401)
    expect((await POST(request("00000000-0000-4000-8000-000000000000"))).status).toBe(403)
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.createClient).not.toHaveBeenCalled()
  })

  it("does not delete account or media without a server secret", async () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "")
    expect((await POST(request())).status).toBe(503)
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.removeImages).not.toHaveBeenCalled()
  })

  it("does not delete account when Storage readiness preflight fails", async () => {
    mock.listImages.mockReset().mockResolvedValue({ data: null, error: { message: "Storage unavailable" } })
    expect((await POST(request())).status).toBe(503)
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.removeImages).not.toHaveBeenCalled()
  })

  it("does not delete any images if account deletion fails", async () => {
    mock.rpc.mockResolvedValueOnce({ error: { message: "DB reject" } })
    expect((await POST(request())).status).toBe(500)
    expect(mock.removeImages).not.toHaveBeenCalled()
    expect(mock.removeAvatars).not.toHaveBeenCalled()
  })

  it("cleans up only the deleted user's images after the database commit", async () => {
    const result = await POST(request(userId))
    expect(result.status).toBe(200)
    expect((await result.json()).media_cleanup_pending).toBeUndefined()
    expect(mock.events).toEqual(["delete-account", "remove-images", "remove-avatars"])
    expect(mock.rpc).toHaveBeenCalledWith("delete_user_data", { user_id_to_delete: userId })
    expect(mock.removeImages).toHaveBeenCalledWith([userId + "/cover.jpg"])
    expect(mock.removeAvatars).toHaveBeenCalledWith([userId + ".png"])
  })

  it("returns successful account deletion with an explicit warning if post-delete storage cleanup fails", async () => {
    mock.removeImages.mockResolvedValueOnce({ error: { message: "timeout" } })
    const result = await POST(request())
    expect(result.status).toBe(200)
    expect((await result.json()).media_cleanup_pending).toBe(true)
    expect(mock.events[0]).toBe("delete-account")
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  })
})
