export function viewerCacheKey(namespace: string, resource: string | null | undefined, viewerId: string | null | undefined, authLoading: boolean) {
  // RLS-visible responses must not be reused across accounts. Delay guest reads until auth settles.
  return resource && !authLoading ? [namespace, viewerId ?? "guest", resource] as const : null
}

// The optimistic item UI contains viewer-specific like/bookmark flags.
export function itemOverlayKey(itemId: string, viewerId: string | null | undefined): string {
  return "itemDetail|" + (viewerId ?? "guest") + "|" + itemId
}

// Only lists for this viewer may receive personalized liked/bookmarked updates.
// Explore is public and has no per-viewer key, so never patch it with private flags.
export function viewerOwnsListCache(key: string, viewerId: string | null): boolean {
  const who = viewerId ?? "guest"
  if (key.startsWith("items|")) return key.endsWith("|" + who)
  if (key.startsWith("recipes||")) return key.endsWith("||" + who)
  if (key.startsWith("bookmarks_")) return key === "bookmarks_" + who
  if (key.startsWith("user_items_")) return key.endsWith("_" + who)
  return false
}
