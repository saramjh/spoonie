import Image from "next/image"
import Link from "@/components/kit/NavigationLink"
import type { ReactNode } from "react"
import { PageHeader } from "@/components/kit"

interface AuthScreenProps {
	title: string
	intro?: { heading: string; description: string; hint?: string }
	showLegalLinks?: boolean
	children: ReactNode
}

export default function AuthScreen({ title, intro, showLegalLinks = false, children }: AuthScreenProps) {
	return (
		<div className="min-h-screen bg-paper">
			<PageHeader title={title} />
			<div className="mx-auto w-full max-w-md px-6 pb-16 pt-8">
				{intro && (
					<div className="mb-7">
						<Link href="/" className="inline-flex" aria-label="Spoonie 홈">
							<Image src="/logo-full.svg" alt="Spoonie" width={140} height={45} priority />
						</Link>
						<h2 className="mt-5 text-[1.75rem]/tight font-bold tracking-tight text-ink">{intro.heading}</h2>
						<p className="mt-2 text-label text-ink-soft">{intro.description}</p>
						{intro.hint && <p className="mt-2 text-meta text-ink-soft">{intro.hint}</p>}
					</div>
				)}
				{children}
				{showLegalLinks && (
					<div className="mt-6 text-center space-x-3">
						<Link href="/legal/privacy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">개인정보처리방침</Link>
						<span className="text-meta text-ink-soft/60">|</span>
						<Link href="/legal/terms" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">이용약관</Link>
						<span className="text-meta text-ink-soft/60">|</span>
						<Link href="/legal/policy" className="text-meta text-ink-soft hover:text-ink transition-colors duration-200">운영정책</Link>
					</div>
				)}
			</div>
		</div>
	)
}
