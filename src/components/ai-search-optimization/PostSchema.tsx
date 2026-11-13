import { serializeJsonLd } from "@/shared/lib/json-ld"
import type { ItemDetail } from "@/types/item"

/**
 * 레시피드용 schema.org SocialMediaPosting.
 * 레시피드는 레시피 파생 활동에 한정되지 않는 일반 음식·요리·주방 소셜 콘텐츠다.
 */
type PublicPostComment = {
  content: string
  created_at: string
  user: { display_name: string | null; username: string | null; public_id: string | null } | null
}

export default function PostSchema({ item, baseUrl, comments }: {
  item: ItemDetail
  baseUrl: string
  comments: PublicPostComment[]
}) {
  const authorName = item.display_name || item.username || "사용자"
  const body = item.content || item.description
  const visibleComments = comments.filter((comment) => comment.content.trim())
  const sharedContent = (item.cited_recipe_ids || []).filter(Boolean).map((id) => ({
    "@type": "WebPage",
    url: `${baseUrl}/recipes/${id}`,
  }))

  const schema = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    url: `${baseUrl}/posts/${item.id}`,
    datePublished: item.created_at,
    ...((item as ItemDetail & { updated_at?: string | null }).updated_at && { dateModified: (item as ItemDetail & { updated_at?: string | null }).updated_at }),
    ...(body && { text: body }),
    ...(item.tags?.length && { keywords: item.tags.join(", ") }),
    ...(item.image_urls?.length && { image: item.image_urls }),
    ...(sharedContent.length === 1 && { sharedContent: sharedContent[0] }),
    ...(sharedContent.length > 1 && { sharedContent }),
    author: {
      "@type": item.author?.entity_type === "organization" ? "Organization" : "Person",
      name: authorName,
      ...(item.user_public_id && { url: `${baseUrl}/profile/${item.user_public_id}` }),
    },
    commentCount: item.comments_count ?? 0,
    ...(visibleComments.length > 0 && {
      comment: visibleComments.map((comment) => ({
        "@type": "Comment",
        text: comment.content,
        datePublished: comment.created_at,
        author: {
          "@type": "Person",
          name: comment.user?.display_name || comment.user?.username || "사용자",
          ...(comment.user?.public_id && { url: `${baseUrl}/profile/${comment.user.public_id}` }),
        },
      })),
    }),
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: item.likes_count ?? 0 },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: item.comments_count ?? 0 },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
}
