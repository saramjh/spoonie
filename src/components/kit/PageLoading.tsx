import SpoonieLogo from "@/components/brand/SpoonieLogo"

// 모양을 미리 알 수 없는 화면(작성 폼, 로그인 확인, 첫 경로 전환)을 기다리는 동안의 표시.
// 스플래시·당겨서 새로고침과 같은 "숟가락 뜨기" 하나로 통일한다. 모양을 아는 화면은 그 모양의 스켈레톤을 쓴다.
export function PageLoading({ label = "불러오는 중" }: { label?: string }) {
	return (
		<div role="status" aria-label={label} className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
			<SpoonieLogo variant="icon" motion="stir" className="h-10 w-10" title="" />
			<span className="text-sm text-ink-soft">{label}</span>
		</div>
	)
}
