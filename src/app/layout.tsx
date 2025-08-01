import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper"

const fontSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-sans",
	weight: "300 700", // 실제 사용되는 weight 범위로 최적화 (light ~ bold)
	display: "swap",
	preload: true,
})

export const metadata: Metadata = {
	title: "Spoonie",
	description: "A social platform for sharing recipes.",
	manifest: "/manifest.json",
	icons: {
		icon: "/favicon-32x32.png",
		apple: "/apple-touch-icon.png",
	},
}

export const viewport = {
	themeColor: "#f97316",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)} suppressHydrationWarning={true}>
				<ClientLayoutWrapper>{children}</ClientLayoutWrapper>
				<Toaster />
			</body>
		</html>
	)
}