export const HOME_FEED_PAGE_SIZE = 10

type FeedItemLike = {
  user_id?: string | null
  created_at?: string | null
}

function sameFeedDay(a: FeedItemLike, b: FeedItemLike): boolean {
  if (!a.created_at || !b.created_at) return true
  return a.created_at.slice(0, 10) === b.created_at.slice(0, 10)
}

/**
 * 최신순을 기본으로 두고, 같은 날짜 안에서 대체 후보가 바로 근처에 있을 때만
 * 같은 작성자 3연속을 끊는다. popularity 점수나 임의 가중치는 사용하지 않는다.
 */
export function diversifyRecentFeed<T extends FeedItemLike>(items: T[], maxConsecutive = 2, lookahead = 4): T[] {
  if (items.length < maxConsecutive + 1) return items

  const result = [...items]
  for (let index = maxConsecutive; index < result.length; index += 1) {
    const author = result[index]?.user_id
    if (!author) continue

    let sameRun = true
    for (let back = 1; back <= maxConsecutive; back += 1) {
      if (result[index - back]?.user_id !== author) {
        sameRun = false
        break
      }
    }
    if (!sameRun) continue

    const maxIndex = Math.min(result.length - 1, index + lookahead)
    let replacement = -1
    for (let candidate = index + 1; candidate <= maxIndex; candidate += 1) {
      if (
        result[candidate]?.user_id
        && result[candidate].user_id !== author
        && sameFeedDay(result[index], result[candidate])
      ) {
        replacement = candidate
        break
      }
    }
    if (replacement === -1) continue

    const [nextDifferentAuthor] = result.splice(replacement, 1)
    result.splice(index, 0, nextDifferentAuthor)
  }

  return result
}
