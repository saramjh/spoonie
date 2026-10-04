/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, expect, it } from "vitest"

// Netlify Functions are CommonJS in this directory.
const {
  _InstagramApiError: InstagramApiError,
  _instagramFailurePlan: instagramFailurePlan,
  _instagramPendingPath: instagramPendingPath,
  _instagramPostGap: instagramPostGap,
  _serializeInstagramError: serializeInstagramError,
} = require("../../../netlify/functions/release-queued-recipes.js")

describe("Instagram scheduled publishing retries", () => {
  it("selects errored rows again when their retry is due", () => {
    const path = instagramPendingPath(new Date("2026-10-04T11:00:00Z"))

    expect(path).toContain("instagram_media_id=is.null")
    expect(path).toContain("instagram_terminal_error=eq.false")
    expect(path).not.toContain("instagram_error=is.null")
    expect(path).toContain("instagram_next_retry_at.is.null")
    expect(path).toContain("instagram_next_retry_at.lte.2026-10-04T11%3A00%3A00.000Z")
  })

  it("retries an unknown Fatal API error instead of permanently dropping the recipe", () => {
    const error = new InstagramApiError("/123/media", "Fatal", { status: 500 })
    const plan = instagramFailurePlan(error, 1, Date.parse("2026-10-04T09:30:00Z"))

    expect(plan).toEqual({
      terminal: false,
      nextRetryAt: "2026-10-04T09:45:00.000Z",
    })
  })

  it("stops after the fifth failed attempt", () => {
    const error = new InstagramApiError("/123/media", "Fatal", { status: 500 })
    expect(instagramFailurePlan(error, 5).terminal).toBe(true)
  })

  it("does not blindly retry an ambiguous transport failure during media_publish", () => {
    const error = new InstagramApiError("/123/media_publish", "socket closed", { transport: true })
    expect(instagramFailurePlan(error, 1).terminal).toBe(true)
  })

  it("treats authentication and permission errors as terminal", () => {
    for (const code of [10, 190, 200]) {
      const error = new InstagramApiError("/123/media", "permission", { status: 400, code })
      expect(instagramFailurePlan(error, 1).terminal).toBe(true)
    }
  })

  it("stores useful API error metadata", () => {
    const error = new InstagramApiError("/123/media", "Fatal", {
      status: 400,
      code: 2,
      subcode: 99,
      isTransient: true,
    })
    const text = serializeInstagramError(error)

    expect(text).toContain("status=400")
    expect(text).toContain("code=2")
    expect(text).toContain("subcode=99")
    expect(text).toContain("transient=true")
  })
})


describe("Instagram publishing cadence", () => {
  it("blocks another successful post inside the three-hour gap", () => {
    expect(
      instagramPostGap("2026-10-04T09:00:00.000Z", new Date("2026-10-04T11:59:00.000Z"))
    ).toEqual({
      blocked: true,
      nextEligibleAt: "2026-10-04T12:00:00.000Z",
    })
  })

  it("allows posting once the minimum gap has elapsed", () => {
    expect(
      instagramPostGap("2026-10-04T09:00:00.000Z", new Date("2026-10-04T12:00:00.000Z"))
    ).toEqual({
      blocked: false,
      nextEligibleAt: "2026-10-04T12:00:00.000Z",
    })
  })
})
