import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline", // 오프라인 시 보여줄 페이지
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
