import Image from "next/image"

// 홈으로 들어올 때 정적 HTML에 함께 실려 첫 바이트와 동시에 보이는 화면.
// 그동안 브라우저는 로그인 확인과 피드 갱신을 진행하고, ClientLayoutWrapper가 확인이 끝나면 닫는다.
// 자바스크립트 없이도 그려지도록 애니메이션 상태를 두지 않는다.
export default function SplashScreen() {
	return (
		<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-door" role="status" aria-label="스푸니를 여는 중">
			<Image src="/logo-full.svg" alt="스푸니" width={180} height={57} priority />
			<p className="mt-5 text-lg font-semibold text-ink-soft">요리의 즐거움, 한 스푼</p>
		</div>
	)
}
