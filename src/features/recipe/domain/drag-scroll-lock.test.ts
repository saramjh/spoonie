import { describe, expect, it } from "vitest"
import { lockDragBodyScroll } from "./drag-scroll-lock"

describe("ingredient drag body-scroll lock", () => {
  it("restores prior scroll styles after drag cancel or finish", () => {
    const body = { style: { overflow: "auto", touchAction: "pan-y" } } as HTMLElement
    const release = lockDragBodyScroll(body)
    expect(body.style.overflow).toBe("hidden")
    expect(body.style.touchAction).toBe("none")
    release()
    release()
    expect(body.style.overflow).toBe("auto")
    expect(body.style.touchAction).toBe("pan-y")
  })
  it("releases an initially unlocked page", () => {
    const body = { style: { overflow: "", touchAction: "" } } as HTMLElement
    lockDragBodyScroll(body)()
    expect(body.style.overflow).toBe("")
    expect(body.style.touchAction).toBe("")
  })
})
