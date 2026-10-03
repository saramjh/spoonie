// 한국어 조사: 받침 유무에 따라 "로/으로"를 고른다. 받침 ㄹ은 "로"를 쓴다.
// 한글로 끝나지 않으면(영문, 숫자 등) 판단할 수 없으므로 "로"를 쓴다.
export function withRo(word: string): string {
	const last = word.trim().slice(-1)
	const code = last.charCodeAt(0) - 0xac00
	if (code < 0 || code > 11171) return `${word}로`
	const jong = code % 28
	return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`
}
