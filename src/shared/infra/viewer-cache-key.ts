export function viewerCacheKey(namespace: string, resource: string | null | undefined, viewerId: string | null | undefined, authLoading: boolean) {
  // RLS-visible responses must not be reused across accounts. Delay guest reads until auth settles.
  return resource && !authLoading ? [namespace, viewerId ?? "guest", resource] as const : null
}
