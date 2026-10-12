import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const authScreens = [
  "login/login-client.tsx",
  "signup/signup-client.tsx",
  "forgot-password/forgot-password-client.tsx",
  "reset-password/reset-password-client.tsx",
]

describe("one main landmark per page", () => {
  it("application shell owns the page main landmark", () => {
    const shell = readFileSync(resolve(process.cwd(), "src/components/layout/AppWrapper.tsx"), "utf8")
    expect(shell).toMatch(/<main\b/)
  })

  it.each(authScreens)("%s must not nest a second main landmark", (file) => {
    const screen = readFileSync(resolve(process.cwd(), "src/app/(auth)", file), "utf8")
    expect(screen).not.toMatch(/<\/?main\b/)
  })
})
