/** Shared by the app shell and pending-navigation preview so their header placement agrees. */
const SUB_SCREEN = /^\/(?:(?:recipes|posts)\/[^/]+|profile\/[^/]+\/edit|offline|magazine(?:\/[^/]*)?|legal\/(?:terms|privacy|policy))(?:\/|$)/

export function hasAppHeader(pathname: string): boolean {
  const partner = pathname === "/partners" || pathname.startsWith("/partners/")
  const auth = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname)
  return !SUB_SCREEN.test(pathname) && !partner && !auth
}
