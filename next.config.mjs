import withPWA from "@ducanh2912/next-pwa";

// PWA 서비스워커. 캐시 규칙은 workboxOptions.runtimeCaching에 두어야 적용된다
// (최상위에 두면 무시되고 기본 규칙만 쓰여, Supabase API 응답까지 cross-origin 캐시에 저장됐었다).
// 아래 규칙이 먼저 맞춰지고, 나머지는 플러그인 기본 규칙(해시된 정적 파일 캐시 우선, 문서 네트워크 우선 등)을 따른다.
const SUPABASE_HOST = "dtyiyzfftsewpckfkqmo.supabase.co"

const pwaConfig = withPWA({
	dest: "public",
	register: true,
	skipWaiting: true,
	reloadOnOnline: true,
	// 글꼴 조각(92개)은 설치 시 미리 받지 않고, 실제로 쓰는 글자 범위만 받아 캐시한다
	publicExcludes: ["!noprecache/**/*", "!fonts/**/*"],
	cacheOnFrontEndNav: true,
	fallbacks: {
		document: "/offline",
	},
	extendDefaultRuntimeCaching: true,
	workboxOptions: {
		// 푸시 알림 수신·클릭 처리
		importScripts: ["/custom-sw.js"],
		additionalManifestEntries: [{ url: "/custom-sw.js", revision: Date.now().toString() }],
		runtimeCaching: [
			{
				// 로그인 정보·글 데이터(REST, 인증, 실시간, 함수)는 절대 캐시하지 않는다
				urlPattern: ({ url }) => url.hostname === SUPABASE_HOST && !url.pathname.startsWith("/storage/v1/object/public/"),
				handler: "NetworkOnly",
			},
			{
				// 업로드한 사진: 파일 이름이 바뀌지 않으므로 캐시 우선 (프로필 사진은 ?t= 로 새 주소가 된다)
				urlPattern: ({ url }) => url.hostname === SUPABASE_HOST && url.pathname.startsWith("/storage/v1/object/public/"),
				handler: "CacheFirst",
				options: {
					cacheName: "spoonie-photos",
					expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
					cacheableResponse: { statuses: [0, 200] },
				},
			},
			{
				// 자체 호스팅 글꼴: 파일 이름이 고정이므로 캐시 우선
				urlPattern: /\/fonts\/pretendard\/.*\.woff2$/,
				handler: "CacheFirst",
				options: {
					cacheName: "spoonie-fonts",
					expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 },
				},
			},
			{
				// 분석·광고 요청은 서비스워커가 손대지 않는다
				urlPattern: /^https:\/\/([a-z0-9-]+\.)*(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|googlesyndication\.com|googleadservices\.com|doubleclick\.net)\//i,
				handler: "NetworkOnly",
			},
		],
	},
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
