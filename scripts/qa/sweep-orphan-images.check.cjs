const { test, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert/strict")

const active = "11111111-1111-4111-8111-111111111111"
const deleted = "22222222-2222-4222-8222-222222222222"
const host = "https://example.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_URL = host
process.env.SUPABASE_SECRET_KEY = "test-secret-only"
const { handler } = require("../../netlify/functions/sweep-orphan-images")

const old = "2025-01-01T00:00:00Z"
const recent = new Date().toISOString()
let originalFetch

beforeEach(() => { originalFetch = global.fetch })
afterEach(() => { global.fetch = originalFetch })

function fixture({ removed = true, referenced = false, tooRecent = false, authError = false, noReferences = false } = {}) {
  const deletedFile = deleted + "/food.jpg"
  const activeFile = active + "/saved.jpg"
  const deletions = []
  const authCalls = []
  global.fetch = async (url, init = {}) => {
    const method = init.method || "GET"
    const pathname = new URL(url).pathname
    const payload = init.body ? JSON.parse(init.body) : {}
    if (pathname === "/auth/v1/admin/users/" + deleted) {
      authCalls.push(deleted)
      return new Response("", { status: authError ? 503 : removed ? 404 : 200 })
    }
    if (pathname === "/auth/v1/admin/users/" + active) {
      authCalls.push(active)
      return new Response("", { status: 200 })
    }
    if (pathname === "/storage/v1/object/list/item-images") {
      const data = payload.prefix === ""
        ? [{ name: deleted, id: null }, { name: active, id: null }]
        : payload.prefix === deleted + "/"
          ? [{ name: "food.jpg", id: "d", created_at: tooRecent ? recent : old }]
          : payload.prefix === active + "/"
            ? [{ name: "saved.jpg", id: "a", created_at: old }]
            : []
      return Response.json(data)
    }
    if (pathname === "/storage/v1/object/list/avatars") {
      return Response.json([
        { name: deleted + ".jpg", id: "av1", created_at: tooRecent ? recent : old },
        { name: active + ".jpg", id: "av2", created_at: old },
      ])
    }
    if (pathname === "/rest/v1/items") {
      return Response.json([{
        image_urls: noReferences ? [] : referenced
          ? [host + "/storage/v1/object/public/item-images/" + deletedFile,
             host + "/storage/v1/object/public/item-images/" + activeFile]
          : [host + "/storage/v1/object/public/item-images/" + activeFile],
      }])
    }
    if (pathname === "/rest/v1/instructions") return Response.json([])
    if (method === "DELETE" && pathname.startsWith("/storage/v1/object/")) {
      deletions.push({ bucket: pathname.split("/").at(-1), paths: payload.prefixes })
      return Response.json([])
    }
    throw new Error("Unknown request: " + method + " " + pathname)
  }
  return { deletions, authCalls, deletedFile, activeFile }
}

test("weekly sweep removes only proven deleted-account media and avatar", async () => {
  const { deletions, deletedFile } = fixture()
  const result = await handler()
  assert.equal(result.statusCode, 200)
  assert.deepEqual(deletions, [
    { bucket: "item-images", paths: [deletedFile] },
    { bucket: "avatars", paths: [deleted + ".jpg"] },
  ])
})

test("active members retain photos and avatars", async () => {
  const { deletions } = fixture({ removed: false, referenced: true })
  const result = await handler()
  assert.equal(result.statusCode, 200)
  assert.deepEqual(deletions, [])
})

test("auth admin outage fails safely without object deletion", async () => {
  const { deletions } = fixture({ authError: true })
  const result = await handler()
  assert.equal(result.statusCode, 500)
  assert.deepEqual(deletions, [])
})

test("never deletes an image still referenced by content", async () => {
  const { deletions } = fixture({ referenced: true })
  const result = await handler()
  assert.equal(result.statusCode, 200)
  assert.deepEqual(deletions, [{ bucket: "avatars", paths: [deleted + ".jpg"] }])
})

test("24-hour grace period protects recently created media", async () => {
  const { deletions } = fixture({ tooRecent: true })
  const result = await handler()
  assert.equal(result.statusCode, 200)
  assert.deepEqual(deletions, [])
})


test("deleted-account cleanup proceeds even when no live recipe references exist", async () => {
  const { deletions, deletedFile } = fixture({ noReferences: true })
  const result = await handler()
  assert.equal(result.statusCode, 200)
  assert.deepEqual(deletions, [
    { bucket: "item-images", paths: [deletedFile] },
    { bucket: "avatars", paths: [deleted + ".jpg"] },
  ])
})
