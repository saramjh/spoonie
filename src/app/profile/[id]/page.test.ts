import { beforeEach, describe, expect, it, vi } from "vitest"
import { generateMetadata, generateStaticParams, revalidate } from "./page"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"
import { fetchProfile, profileIdentifierColumn } from "@/features/profile/data/profile-repository"
import { fetchAllPublicDiscoveryItems } from "@/features/discovery/data/public-assets"

vi.mock("./ProfilePageClient", () => ({ default: vi.fn() }))
vi.mock("@/shared/infra/supabase-public", () => ({ createSupabasePublicClient: vi.fn() }))
vi.mock("@/shared/infra/supabase-client", () => ({ createSupabaseBrowserClient: vi.fn() }))
vi.mock("@/features/discovery/data/public-assets", () => ({ fetchAllPublicDiscoveryItems: vi.fn() }))

const uuid = "b835595a-89ab-42d7-a94a-5e50108984fb"
const profile = {
	id: uuid,
	public_id: "sp1a2b3c",
	username: "cook",
	display_name: "집밥 기록",
	profile_message: "오늘도 집에서 요리합니다.\n반갑습니다.",
	created_at: "2026-10-01T00:00:00Z",
}
const props = (id: string) => ({ params: Promise.resolve({ id }) })

function publicClient(data: unknown, error: unknown = null) {
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn(() => query),
		single: vi.fn(async () => ({ data, error })),
	}
	const client = { from: vi.fn(() => query) }
	vi.mocked(createSupabasePublicClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabasePublicClient>)
	return { client, ...query, ...client }
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(fetchAllPublicDiscoveryItems).mockResolvedValue([])
})

describe("profile metadata canonical identity", () => {
	it.each([
		["sp1a2b3c", "public_id"],
		["1f321b7a", "public_id"],
		[uuid, "id"],
		[uuid.toUpperCase(), "id"],
	])("기존 브라우저 조회와 메타데이터가 같은 identifier 규칙을 쓴다: %s", async (identifier, column) => {
		const db = publicClient(profile)
		expect(profileIdentifierColumn(identifier)).toBe(column)
		await fetchProfile(identifier, db.client as unknown as Parameters<typeof fetchProfile>[1])
		expect(db.eq).toHaveBeenCalledExactlyOnceWith(column, identifier)
	})
	it("canonical URL과 OG는 요청 문자열 대신 조회된 public_id를 쓴다", async () => {
		const db = publicClient(profile)
		const metadata = await generateMetadata(props("requested-public-id"))
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
		expect(metadata.alternates?.canonical).toBe(`${baseUrl}/profile/sp1a2b3c`)
		expect(metadata.openGraph).toMatchObject({ url: `${baseUrl}/profile/sp1a2b3c` })
		expect(db.from).toHaveBeenCalledExactlyOnceWith("profiles")
		expect(db.eq).toHaveBeenCalledExactlyOnceWith("public_id", "requested-public-id")
		expect(fetchAllPublicDiscoveryItems).toHaveBeenCalledExactlyOnceWith({ userId: uuid }, expect.anything())
	})
	it("UUID도 public_id canonical을 제공하며 noindex와 단일 메타데이터 조회를 유지한다", async () => {
		const db = publicClient(profile)
		const metadata = await generateMetadata(props(uuid))
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
		expect(metadata.alternates?.canonical).toBe(`${baseUrl}/profile/sp1a2b3c`)
		expect(metadata.openGraph).toMatchObject({ url: `${baseUrl}/profile/sp1a2b3c` })
		expect(metadata.robots).toMatchObject({ index: false, follow: true, googleBot: { index: false, follow: true } })
		expect(metadata.description).toBe("오늘도 집에서 요리합니다. 반갑습니다.")
		expect(db.from).toHaveBeenCalledExactlyOnceWith("profiles")
		expect(db.eq).toHaveBeenCalledExactlyOnceWith("id", uuid)
		expect(fetchAllPublicDiscoveryItems).not.toHaveBeenCalled()
	})
	it("UUID 소개가 없을 때 조회하지 않은 활동 수를 0개로 표시하지 않는다", async () => {
		publicClient({ ...profile, profile_message: null })
		const metadata = await generateMetadata(props(uuid))
		expect(metadata.description).toBe("집밥 기록님의 Spoonie 프로필. 공개 요리 기록을 볼 수 있어요.")
		expect(fetchAllPublicDiscoveryItems).not.toHaveBeenCalled()
	})
	it("canonical URL의 기존 공개 활동 색인 판정과 설명 통계를 유지한다", async () => {
		publicClient(profile)
		vi.mocked(fetchAllPublicDiscoveryItems).mockResolvedValue([
			{ item_type: "recipe" },
			{ item_type: "post", content: "직접 만들어 먹은 집밥을 남깁니다." },
		] as Awaited<ReturnType<typeof fetchAllPublicDiscoveryItems>>)
		const metadata = await generateMetadata(props(profile.public_id))
		expect(metadata.robots).toMatchObject({ index: true, follow: true })
		expect(metadata.description).toContain("공개 레시피 1개 · 레시피드 1개")
	})
	it.each([null, { ...profile, public_id: null }])("공개 identity가 없으면 canonical을 생성하지 않는다: %j", async (data) => {
		publicClient(data)
		const metadata = await generateMetadata(props(uuid))
		expect(metadata.alternates).toBeUndefined()
		expect(metadata.robots).toMatchObject({ index: false })
		expect(fetchAllPublicDiscoveryItems).not.toHaveBeenCalled()
	})
	it("조회 오류로 존재하지 않는 canonical이나 index 문서를 만들지 않는다", async () => {
		publicClient(null, new Error("temporary DB failure"))
		const metadata = await generateMetadata(props(profile.public_id))
		expect(metadata.alternates).toBeUndefined()
		expect(metadata.robots).toMatchObject({ index: false })
	})
	it("메타데이터 조회 예외의 fallback도 noindex다", async () => {
		const db = publicClient(profile)
		db.single.mockRejectedValueOnce(new Error("network unavailable"))
		const log = vi.spyOn(console, "error").mockImplementation(() => {})
		try {
			const metadata = await generateMetadata(props(profile.public_id))
			expect(metadata.alternates).toBeUndefined()
			expect(metadata.robots).toMatchObject({ index: false })
		} finally {
			log.mockRestore()
		}
	})
	it("600초 ISR과 기존 첫 방문 생성 방식을 유지한다", async () => {
		expect(revalidate).toBe(600)
		expect(await generateStaticParams()).toEqual([])
	})
})
