import { defineConfig } from "vitest/config"
import path from "node:path"

// 도메인 계층(순수 함수)의 동작 기록 테스트용. 브라우저·DB 없이 node에서 돈다
export default defineConfig({
	resolve: { alias: { "@": path.resolve(__dirname, "src") } },
	test: { include: ["src/**/*.test.ts"], environment: "node" },
})
