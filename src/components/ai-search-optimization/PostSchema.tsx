import { serializeJsonLd } from "@/shared/lib/json-ld"
import type { ItemDetail } from "@/types/item"

/**
 * 레시피드(게시물)용 schema.org SocialMediaPosting 구조화 데이터.
 * 좋아요와 댓글 수는 DB의 실제 값이다.
 */
export default function PostSchema({ item, baseUrl }: { item: ItemDetail; baseUrl: string }) {
  const authorName = item.display_name || item.username
  const body = item.content || item.description

  const schema = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    url: `${baseUrl}/posts/${item.id}`,
    datePublished: item.created_at,
    ...(item.title && { headline: item.title.slice(0, 110) }),
    ...(body && { text: body }),
    ...(item.image_urls?.length && { image: item.image_urls }),
    ...(authorName && {
      author: {
        "@type": "Person",
        name: authorName,
        ...(item.user_public_id && { url: `${baseUrl}/profile/${item.user_public_id}` }),
      },
    }),
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: item.likes_count ?? 0 },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: item.comments_count ?? 0 },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
}
