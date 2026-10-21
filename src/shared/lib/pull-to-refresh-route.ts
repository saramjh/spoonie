// Only collection screens opt into the global pull-to-refresh gesture.
// Forms, details and editors own their vertical scrolling and touch events.
export function canPullToRefresh(pathname: string): boolean {
  return pathname === "/" || pathname === "/recipes" || pathname === "/search" ||
    pathname === "/bookmarks" || pathname === "/notifications" ||
    /^\/profile\/[^/]+\/?$/.test(pathname)
}
