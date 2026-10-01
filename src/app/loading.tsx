import { PageLoading } from "@/components/kit"

// 자기 로딩 화면이 없는 경로로 처음 이동할 때 보인다. 화면마다 모양이 달라 특정 화면 모양의 스켈레톤을 쓰지 않는다.
export default function Loading() {
	return <PageLoading />
}
