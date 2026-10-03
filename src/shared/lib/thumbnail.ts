// 대표 사진(thumbnail_index)을 맨 앞으로 옮긴 표시 순서. 인덱스가 범위를 벗어나면 원래 순서 그대로
export function orderImagesForDisplay(imageUrls: string[] | null | undefined, thumbnailIndex: number | null | undefined): string[] {
	const urls = imageUrls ?? []
	const index = thumbnailIndex ?? 0
	if (!Number.isInteger(index) || index <= 0 || index >= urls.length) return urls
	return [urls[index], ...urls.slice(0, index), ...urls.slice(index + 1)]
}
