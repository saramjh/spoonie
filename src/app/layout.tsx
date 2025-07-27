import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper"

const fontSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-sans",
	weight: "100 900",
})

const fontMono = localFont({
	src: "./fonts/GeistMonoVF.woff",
	variable: "--font-mono",
	weight: "100 900",
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
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable, fontMono.variable)} suppressHydrationWarning={true}>
				<ClientLayoutWrapper>{children}</ClientLayoutWrapper>
				<Toaster />
			</body>
		</html>
	)
}