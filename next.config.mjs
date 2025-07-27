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
}

export default pwaConfig(nextConfig);
