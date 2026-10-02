import type { Config } from "tailwindcss"
import * as tailwindAnimate from "tailwindcss-animate"

const config: Config = {
	content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			// 글자 역할 (DESIGN.md Typography). 크기 값이 아니라 역할 이름으로 쓴다. 기본 굵기·줄 간격·자간이 함께 온다.
			// display/title은 700, heading은 600으로 정해져 있어 따로 font-bold를 붙이지 않는다.
			fontSize: {
				display: ["1.625rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
				// 요리 모드의 지금 단계: 팔 길이 거리에서 읽는 큰 글자, 굵기는 본문 쪽
				step: ["1.625rem", { lineHeight: "1.55", fontWeight: "500" }],
				title: ["1.25rem", { lineHeight: "1.35", letterSpacing: "-0.015em", fontWeight: "700" }],
				heading: ["1.0625rem", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }],
				read: ["1.0625rem", { lineHeight: "1.65" }],
				body: ["1rem", { lineHeight: "1.6" }],
				label: ["0.9375rem", { lineHeight: "1.4" }],
				meta: ["0.8125rem", { lineHeight: "1.45" }],
				micro: ["0.6875rem", { lineHeight: "1.2", fontWeight: "600" }],
			},
			fontFamily: {
				sans: ['"Pretendard Variable"', "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", '"Apple SD Gothic Neo"', '"Noto Sans KR"', "sans-serif"],
			},
			// 색은 globals.css :root의 RGB 변수 한 곳에서 온다 (DESIGN.md Colors). 이름은 두 갈래:
			// 팔레트 이름(door, paper, ink...)과, shadcn ui가 쓰는 역할 이름(primary, muted, border...). 역할 이름도 같은 변수를 가리킨다.
			colors: {
				door: "rgb(var(--door) / <alpha-value>)",
				paper: "rgb(var(--paper) / <alpha-value>)",
				ink: {
					DEFAULT: "rgb(var(--ink) / <alpha-value>)",
					soft: "rgb(var(--ink-soft) / <alpha-value>)",
				},
				"orange-ink": "rgb(var(--orange-ink) / <alpha-value>)",
				like: "rgb(var(--like) / <alpha-value>)",
				"changed-mark": "rgb(var(--changed-mark) / <alpha-value>)",

				background: "rgb(var(--door) / <alpha-value>)",
				foreground: "rgb(var(--ink) / <alpha-value>)",
				border: "rgb(var(--rule-line) / <alpha-value>)",
				input: "rgb(var(--rule-line) / <alpha-value>)",
				ring: "rgb(var(--orange-ink) / <alpha-value>)",
				primary: {
					DEFAULT: "rgb(var(--brand-orange) / <alpha-value>)",
					foreground: "rgb(var(--ink) / <alpha-value>)",
				},
				secondary: {
					DEFAULT: "rgb(var(--paper-tint) / <alpha-value>)",
					foreground: "rgb(var(--ink) / <alpha-value>)",
				},
				muted: {
					DEFAULT: "rgb(var(--paper-tint) / <alpha-value>)",
					foreground: "rgb(var(--ink-soft) / <alpha-value>)",
				},
				accent: {
					DEFAULT: "rgb(var(--paper-tint) / <alpha-value>)",
					foreground: "rgb(var(--ink) / <alpha-value>)",
				},
				destructive: {
					DEFAULT: "rgb(var(--danger) / <alpha-value>)",
					foreground: "rgb(var(--paper) / <alpha-value>)",
				},
				card: {
					DEFAULT: "rgb(var(--paper) / <alpha-value>)",
					foreground: "rgb(var(--ink) / <alpha-value>)",
				},
				popover: {
					DEFAULT: "rgb(var(--paper) / <alpha-value>)",
					foreground: "rgb(var(--ink) / <alpha-value>)",
				},
			},
			boxShadow: {
				sheet: "var(--sheet-shadow)",
			},
		},
	},
	plugins: [tailwindAnimate],
}

export default config
