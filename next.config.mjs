import withPWA from "@ducanh2912/next-pwa";

// 🎯 PWA 재활성화 + SyntaxError 근본 해결 전략
// Supabase Realtime과 Webpack 모듈 충돌 방지를 위한 정교한 캐싱 전략
const pwaConfig = withPWA({
	dest: "public",
	register: true,      // ✅ PWA 다시 활성화!
	skipWaiting: true,
	disable: false,      // ✅ PWA 기능 복원!
	reloadOnOnline: true,
	cacheOnFrontEndNav: true,
	fallbacks: {
		document: "/offline",
	},
	// 🆓 무료 푸시 알림: 기존 PWA 기능 보존하면서 push 기능 추가
	workboxOptions: {
		// 기존 PWA 기능 유지하면서 커스텀 SW 코드 추가
		importScripts: ['/custom-sw.js'],
		additionalManifestEntries: [
			{ url: '/custom-sw.js', revision: Date.now().toString() }
		]
	},
	// 🚨 핵심: SyntaxError 방지를 위한 전략적 캐싱
	runtimeCaching: [
		{
			// 🎯 JavaScript 파일: 네트워크 우선으로 최신 코드 보장
			urlPattern: /\/_next\/static\/chunks\/.*\.js$/,
			handler: 'NetworkFirst',
			options: {
				cacheName: 'spoonie-js-cache-v3',
				expiration: {
					maxEntries: 30,        // 최소한의 캐시
					maxAgeSeconds: 60 * 60 * 24 * 2, // 2일로 단축
				},
				networkTimeoutSeconds: 3,  // 빠른 타임아웃
				// 🔥 캐시 무효화 강화
				plugins: [{
					cacheKeyWillBeUsed: async ({ request }) => {
						const url = new URL(request.url)
						// 빌드 해시가 변경되면 자동으로 캐시 무효화
						return `${url.pathname}?v=${url.searchParams.get('v') || 'latest'}`
					}
				}]
			},
		},
		{
			// 🚨 Realtime/WebSocket 관련: 절대 캐시하지 않음
			urlPattern: /(realtime|websocket|supabase.*realtime)/i,
			handler: 'NetworkOnly',
		},
		{
			// 🎯 Google Tag Manager 스크립트: 완전 무시 (Service Worker가 개입하지 않음)
			urlPattern: /^https:\/\/www\.googletagmanager\.com\/gtag\/js\?.*/,
			handler: 'NetworkOnly',
		},
		{
			// 🎯 Google Analytics 도메인: 네트워크 전용
			urlPattern: /^https:\/\/(www\.)?google-analytics\.com\/.*/i,
			handler: 'NetworkOnly',
		},
		{
			// 🎯 Google Analytics 수집 엔드포인트: 네트워크 전용
			urlPattern: /^https:\/\/(www\.)?googletagmanager\.com\/.*(?:collect|g\/collect).*/i,
			handler: 'NetworkOnly',
		},
		{
			// 🎯 기타 Google 분석/광고 도메인: 네트워크 전용
			urlPattern: /^https:\/\/(www\.)?(googleadservices|googlesyndication|doubleclick)\.net\/.*/i,
			handler: 'NetworkOnly',
		},
		{
			// 🎨 CSS: 안전한 캐싱
			urlPattern: /\/_next\/static\/css\/.*\.css$/,
			handler: 'StaleWhileRevalidate',
			options: {
				cacheName: 'spoonie-css-cache-v3',
				expiration: {
					maxEntries: 20,
					maxAgeSeconds: 60 * 60 * 24 * 7,
				},
			},
		},
		{
			// 🖼️ 이미지: 적극적 캐싱 (변경 빈도 낮음)
			urlPattern: /\/_next\/static\/media\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
			handler: 'CacheFirst',
			options: {
				cacheName: 'spoonie-image-cache-v3',
				expiration: {
					maxEntries: 100,
					maxAgeSeconds: 60 * 60 * 24 * 30,
				},
			},
		},
	],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Your Next.js config
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'dtyiyzfftsewpckfkqmo.supabase.co',
				port: '',
				pathname: '/storage/v1/object/public/**',
			},
		],
		unoptimized: true, // Supabase 이미지에 대한 Next.js 서버 측 최적화 비활성화
	},
	// 🔧 실험적 기능
	experimental: {
		optimizePackageImports: ['lucide-react'],
	},

	// 🔄 /posts 목록 경로만 홈으로 리디렉션
	async redirects() {
		return [
			{
				source: '/posts',
				destination: '/',
				permanent: true,
			},
		]
	},

	// 🔧 빌드 안정성 개선: SyntaxError 방지
	compiler: {
		removeConsole: process.env.NODE_ENV === 'production' ? {
			exclude: ['error', 'warn'] // error, warn은 유지
		} : false,
	},
	// 🌐 개발 환경에서 Cross-Origin 요청 허용 (모바일 테스트용)
	allowedDevOrigins: [
		// 로컬 네트워크 IP 범위 허용 (192.168.x.x)
		'192.168.0.0/16',
		'192.168.1.0/24',
		'192.168.0.0/24',
		// 모바일 핫스팟 등 일반적인 로컬 네트워크
		'10.0.0.0/8',
		'172.16.0.0/12',
		// localhost 변형들
		'127.0.0.1',
		'::1',
		'localhost'
	],
}

export default pwaConfig(nextConfig);
