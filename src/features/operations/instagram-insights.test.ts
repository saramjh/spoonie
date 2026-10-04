/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, expect, it } from "vitest"

const {
  _checkpointState: checkpointState,
  _metricValues: metricValues,
} = require("../../../netlify/functions/collect-instagram-insights.js")

describe("Instagram insight checkpoints", () => {
  const published = "2026-10-04T10:00:00.000Z"

  it("waits until the 24h checkpoint is due", () => {
    expect(
      checkpointState(published, "pending", "pending", new Date("2026-10-05T09:59:00.000Z"))
    ).toEqual({ capture: [], miss: [] })
  })

  it("captures 24h within the six-hour observation window", () => {
    expect(
      checkpointState(published, "pending", "pending", new Date("2026-10-05T12:30:00.000Z"))
    ).toEqual({ capture: [24], miss: [] })
  })

  it("marks a missed checkpoint instead of labeling late cumulative data as 24h", () => {
    expect(
      checkpointState(published, "pending", "pending", new Date("2026-10-05T16:01:00.000Z"))
    ).toEqual({ capture: [], miss: [24] })
  })

  it("captures 72h without repeating an already captured 24h checkpoint", () => {
    expect(
      checkpointState(published, "captured", "pending", new Date("2026-10-07T11:00:00.000Z"))
    ).toEqual({ capture: [72], miss: [] })
  })

  it("marks both stale checkpoints missed when historical media is too old", () => {
    expect(
      checkpointState(published, "pending", "pending", new Date("2026-10-08T00:00:00.000Z"))
    ).toEqual({ capture: [], miss: [24, 72] })
  })
})

describe("Instagram insight metrics", () => {
  it("normalizes Graph API metrics and fills missing values with zero", () => {
    expect(
      metricValues([
        { name: "reach", values: [{ value: 51 }] },
        { name: "likes", values: [{ value: 2 }] },
        { name: "total_interactions", total_value: { value: 3 } },
        { name: "profile_visits", values: [{ value: 4 }] },
        { name: "follows", values: [{ value: 1 }] },
      ])
    ).toEqual({
      reach: 51,
      likes: 2,
      comments: 0,
      saved: 0,
      shares: 0,
      total_interactions: 3,
      profile_activity: 0,
      profile_visits: 4,
      follows: 1,
    })
  })
})
