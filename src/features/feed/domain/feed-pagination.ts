/** Only one page request may be in flight per feed observer intersection. */
export function shouldRequestNextFeedPage(
  isIntersecting: boolean,
  isReachingEnd: boolean,
  isLoading: boolean,
  requestPending: boolean,
): boolean {
  return isIntersecting && !isReachingEnd && !isLoading && !requestPending
}
