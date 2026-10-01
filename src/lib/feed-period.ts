// 피드를 시간 덩어리로 나누는 이름: 오늘 / 어제 / 이번 주 / 이번 달 / 2025년 8월
// now가 없으면(서버·첫 화면) 년월만 쓴다: 미리 만든 페이지와 화면을 여는 시점의 "오늘"이 달라 생기는 불일치를 피한다
export function feedPeriod(iso: string, now: Date | null): string {
	const date = new Date(iso)
	if (!now) return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
	const day = 24 * 60 * 60 * 1000
	const t = date.getTime()
	if (t >= startOfToday) return "오늘"
	if (t >= startOfToday - day) return "어제"
	if (t >= startOfToday - 6 * day) return "이번 주"
	if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) return "이번 달"
	return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}
