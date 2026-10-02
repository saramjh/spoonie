// 사진 크기별 버전: 원본(긴 변 최대 1280px) 옆에 같은 이름 + ".w400.jpg", ".w800.jpg" 파일을 둔다.
// 올릴 때 브라우저가 만들고(uploadWithVariants), 화면은 srcset으로 크기에 맞는 것 하나만 받는다.
// Spoonie 저장소(item-images)의 사진에만 적용한다. 프로필 사진·외부 주소는 원본 그대로 쓴다.
export const VARIANT_WIDTHS = [400, 800] as const
type VariantWidth = (typeof VARIANT_WIDTHS)[number]

const ITEM_IMAGES = "/storage/v1/object/public/item-images/"

export function hasVariants(url: string | null | undefined): url is string {
	return !!url && url.includes(ITEM_IMAGES) && !/\.w\d+\.jpg$/.test(url)
}

function variantUrl(url: string, width: VariantWidth): string {
	return hasVariants(url) ? `${url}.w${width}.jpg` : url
}

export function variantPath(path: string, width: VariantWidth): string {
	return `${path}.w${width}.jpg`
}

// 400w / 800w / 원본(1280w)
export function srcSetFor(url: string): string | undefined {
	if (!hasVariants(url)) return undefined
	return `${variantUrl(url, 400)} 400w, ${variantUrl(url, 800)} 800w, ${url} 1280w`
}
