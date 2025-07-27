"use client"

import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, AlertTriangle, CheckCircle, Clock, Database, Users } from "lucide-react"

interface HighActivityItem {
	item_id: string
	item_type: string
	likes_count: number
	comments_count: number
	activity_score: number
}

interface ConcurrencyStats {
	totalItems: number
	totalLikes: number
	totalComments: number
	highActivityItems: HighActivityItem[]
	avgResponseTime: number
	errorCount: number
}

/**
 * 🔍 동시성 모니터링 컴포넌트
 * 개발 환경에서 동시성 문제를 실시간으로 감지하고 통계를 제공
 */
export default function ConcurrencyMonitor() {
	const [stats, setStats] = useState<ConcurrencyStats | null>(null)
	const [isMonitoring, setIsMonitoring] = useState(false)
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
	const [errors, setErrors] = useState<string[]>([])
	const supabase = createSupabaseBrowserClient()

	// 통계 데이터 수집
	const collectStats = async (): Promise<ConcurrencyStats> => {
		const startTime = window.performance.now()

		try {
			// 1. 기본 통계 수집
			const [
				{ count: itemsCount },
				{ count: likesCount },
				{ count: commentsCount },
				{ data: highActivityData }
			] = await Promise.all([
				supabase.from("items").select("*", { count: "exact", head: true }),
				supabase.from("likes").select("*", { count: "exact", head: true }),
				supabase.from("comments").select("*", { count: "exact", head: true }).eq("is_deleted", false),
				supabase.rpc("get_high_concurrency_items", { limit_count: 5 })
			])

			const endTime = window.performance.now()
			const responseTime = endTime - startTime

			return {
				totalItems: itemsCount || 0,
				totalLikes: likesCount || 0,
				totalComments: commentsCount || 0,
				highActivityItems: highActivityData || [],
				avgResponseTime: responseTime,
				errorCount: errors.length
			}
		} catch (error) {
			console.error("❌ Stats collection failed:", error)
			const newError = `Stats collection failed: ${error instanceof Error ? error.message : "Unknown error"}`
			setErrors(prev => [...prev.slice(-4), newError]) // 최근 5개 에러만 보관
			throw error
		}
	}

	// 모니터링 시작/중지
	const toggleMonitoring = () => {
		setIsMonitoring(!isMonitoring)
		if (!isMonitoring) {
			setErrors([]) // 모니터링 시작 시 에러 초기화
		}
	}

	// 통계 강제 새로고침
	const refreshStats = async () => {
		try {
			const newStats = await collectStats()
			setStats(newStats)
			setLastUpdate(new Date())
		} catch (error) {
			console.error("Failed to refresh stats:", error)
		}
	}

	// 자동 모니터링
	useEffect(() => {
		if (!isMonitoring) return

		const interval = setInterval(async () => {
			await refreshStats()
		}, 5000) // 5초마다 업데이트

		// 초기 데이터 로드
		refreshStats()

		return () => clearInterval(interval)
	}, [isMonitoring])

	// 성능 상태 평가
	const getPerformanceStatus = (responseTime: number) => {
		if (responseTime < 100) return { status: "excellent", color: "green", icon: CheckCircle }
		if (responseTime < 300) return { status: "good", color: "blue", icon: CheckCircle }
		if (responseTime < 1000) return { status: "warning", color: "yellow", icon: AlertTriangle }
		return { status: "critical", color: "red", icon: AlertTriangle }
	}

	// 활동 수준 평가
	const getActivityLevel = (score: number) => {
		if (score > 50) return { level: "매우 높음", color: "red" }
		if (score > 20) return { level: "높음", color: "orange" }
		if (score > 10) return { level: "보통", color: "blue" }
		return { level: "낮음", color: "green" }
	}

	if (!stats && !isMonitoring) {
		return (
			<Card className="w-full max-w-4xl mx-auto">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						동시성 모니터링
					</CardTitle>
					<CardDescription>
						실시간으로 데이터베이스 동시성 문제를 감지하고 성능을 모니터링합니다.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={toggleMonitoring} className="w-full">
						모니터링 시작
					</Button>
				</CardContent>
			</Card>
		)
	}

	const performance = stats ? getPerformanceStatus(stats.avgResponseTime) : null
	const PerformanceIcon = performance?.icon || Clock

	return (
		<div className="w-full max-w-6xl mx-auto space-y-6">
			{/* 컨트롤 패널 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Activity className="h-5 w-5" />
							동시성 모니터링
							{isMonitoring && (
								<Badge variant="outline" className="animate-pulse">
									실시간
								</Badge>
							)}
						</div>
						<div className="flex gap-2">
							<Button onClick={refreshStats} variant="outline" size="sm">
								새로고침
							</Button>
							<Button onClick={toggleMonitoring} variant={isMonitoring ? "destructive" : "default"}>
								{isMonitoring ? "중지" : "시작"}
							</Button>
						</div>
					</CardTitle>
					{lastUpdate && (
						<CardDescription>
							마지막 업데이트: {lastUpdate.toLocaleTimeString()}
						</CardDescription>
					)}
				</CardHeader>
			</Card>

			{stats && (
				<>
					{/* 전체 통계 */}
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<Database className="h-4 w-4 text-blue-600" />
									<div>
										<p className="text-sm text-gray-600">총 게시물</p>
										<p className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<Users className="h-4 w-4 text-red-600" />
									<div>
										<p className="text-sm text-gray-600">총 좋아요</p>
										<p className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<Activity className="h-4 w-4 text-green-600" />
									<div>
										<p className="text-sm text-gray-600">총 댓글</p>
										<p className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<PerformanceIcon className={`h-4 w-4 text-${performance?.color}-600`} />
									<div>
										<p className="text-sm text-gray-600">응답 시간</p>
										<p className="text-2xl font-bold">{stats.avgResponseTime.toFixed(0)}ms</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* 고활동 게시물 */}
					<Card>
						<CardHeader>
							<CardTitle>고활동 게시물 (동시성 위험도 높음)</CardTitle>
							<CardDescription>
								활동량이 많아 동시성 문제가 발생할 가능성이 높은 게시물들입니다.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{stats.highActivityItems.map((item, index) => {
									const activity = getActivityLevel(item.activity_score)
									return (
										<div
											key={item.item_id}
											className="flex items-center justify-between p-3 border rounded-lg"
										>
											<div className="flex items-center gap-3">
												<Badge variant="outline">#{index + 1}</Badge>
												<div>
													<p className="font-medium">
														{item.item_type === "recipe" ? "🍳 레시피" : "📱 레시피드"}
													</p>
													<p className="text-sm text-gray-600">{item.item_id.slice(0, 8)}...</p>
												</div>
											</div>
											<div className="flex items-center gap-4">
												<div className="text-right">
													<p className="text-sm">❤️ {item.likes_count}</p>
													<p className="text-sm">💬 {item.comments_count}</p>
												</div>
												<Badge variant="outline" className={`text-${activity.color}-600`}>
													{activity.level}
												</Badge>
												<Badge variant="secondary">
													{item.activity_score.toFixed(1)}점
												</Badge>
											</div>
										</div>
									)
								})}
							</div>
						</CardContent>
					</Card>

					{/* 에러 로그 */}
					{errors.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-red-600">
									<AlertTriangle className="h-5 w-5" />
									최근 에러 ({errors.length}개)
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{errors.map((error, index) => (
										<div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
											{error}
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}
		</div>
	)
} 