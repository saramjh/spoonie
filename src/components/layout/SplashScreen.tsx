import SpoonieLogo from "@/components/brand/SpoonieLogo"

// 홈으로 들어올 때 정적 HTML에 함께 실려 첫 바이트와 동시에 보이는 화면.
// 로고의 숟가락이 한 스푼 뜨는 동안 브라우저는 로그인 확인과 피드 갱신을 진행하고, ClientLayoutWrapper가 확인이 끝나면 닫는다.
// 움직임은 CSS만 쓰므로 자바스크립트가 아직 실행되지 않아도 보인다.
export default function SplashScreen() {
	return (
		<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-door" role="status" aria-label="스푸니를 여는 중">
			<SpoonieLogo motion="intro" className="h-[57px] w-[180px]" />
			<p className="mt-5 text-lg font-semibold text-ink-soft motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">요리의 즐거움, 한 스푼</p>
		</div>
	)
}
