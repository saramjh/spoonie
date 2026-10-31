"use client"

import { IntentLink, Photo, PhotoCount } from "@/components/kit"
import type { Item } from "@/types/item"
import { publicContentText } from "@/features/discovery/domain/search-exposure"

// 레시피드(활동) 한 칸: 사진 아래에 어떤 레시피로 만들었는지와 만든 사람.
// 출처가 없으면 만든 사람만 적는다 (DESIGN.md Interface Grammar 1)
export default function MadeRecordTile({ item, sourceTitle, priority = false }: { item: Item; sourceTitle?: string | null; priority?: boolean }) {
	const id = item.item_id || item.id
	const thumb = item.image_urls?.[item.thumbnail_index || 0]
	const title = publicContentText(item.title)
	const body = publicContentText(item.content || item.description)
	return (
		<IntentLink href={`/posts/${id}`} className="block min-w-0">
			<span className="relative block aspect-square overflow-hidden rounded-[2px] bg-muted">
				{thumb ? (
					<Photo src={thumb} alt="" sizes="(max-width: 448px) 33vw, 150px" priority={priority} />
				) : (
					<span className="flex h-full w-full flex-col justify-center gap-1.5 overflow-hidden bg-paper-tint px-2.5 py-2 text-left">
						<span className="text-micro font-semibold text-ink-soft">요리 기록</span>
						<span className="line-clamp-2 break-words text-meta font-semibold leading-snug text-ink">{title || body || "레시피드"}</span>
						{title && body && <span className="line-clamp-3 break-words text-micro leading-snug text-ink-soft">{body}</span>}
					</span>
				)}
				<PhotoCount count={item.image_urls?.length || 0} />
			</span>
			{sourceTitle && <span className="mt-1 block truncate text-meta font-semibold text-ink">{sourceTitle}</span>}
			<span className={`block truncate text-meta text-ink-soft ${sourceTitle ? "" : "mt-1"}`}>{item.username || item.title || "레시피드"}</span>
		</IntentLink>
	)
}
