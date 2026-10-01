/**
 * Google Analytics 4 (gtag.js 표준 설치)
 *
 * gtag는 반드시 `arguments`를 dataLayer에 넣어야 한다. 배열을 넣으면 gtag.js가 명령으로 인식하지 않아
 * 수집 요청(/g/collect)이 한 번도 나가지 않는다 (이전 구현이 그랬다).
 * 화면 이동(SPA) 조회는 GA4 향상된 측정의 "브라우저 기록 이벤트 기반 페이지 변경"이 자동으로 센다.
 * NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS=true(개발 환경)에서는 싣지 않는다.
 */

import Script from "next/script"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-16DKDXVQ9T"

export default function GoogleAnalytics() {
	if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === "true") return null
	return (
		<>
			<Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
			<Script id="ga-init" strategy="afterInteractive">
				{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
			</Script>
		</>
	)
}
