import { useState, useEffect, useRef, useCallback } from "react";
import SpoonieLogoAnimation from "@/components/common/SpoonieLogoAnimation";
import { mutate } from 'swr';
import { useRefresh } from "@/contexts/RefreshContext";

const PULL_THRESHOLD = 80; // 당겨야 하는 최소 거리 (px)
const PULL_TO_REFRESH_TEXT = "당겨서 새로고침";

/**
 * 🚀 완전한 Pull-to-Refresh 시스템
 * PWA 환경에서 네트워크 오류/캐시 문제 시 실제 데이터 갱신 수행
 */
export const usePullToRefresh = () => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const touchStartRef = useRef(0);
    const { triggerRefresh } = useRefresh();

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (window.scrollY === 0) {
            touchStartRef.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isPulling) return;

        const currentY = e.touches[0].clientY;
        const distance = currentY - touchStartRef.current;

        if (distance > 0) {
            e.preventDefault(); // 스크롤 방지
            setPullDistance(Math.min(distance, PULL_THRESHOLD + 50)); // 최대 당김 거리 제한
        }
    }, [isPulling]);

    const handleTouchEnd = useCallback(async () => {
        if (isPulling && pullDistance >= PULL_THRESHOLD) {
            setIsRefreshing(true);
            
            try {
                
                // 1. 🔥 SWR 캐시 완전 무효화 (모든 키 패턴)
                await Promise.all([
                    // 홈 피드 데이터
                    mutate(
                        (key) => typeof key === 'string' && key.startsWith('items|'),
                        undefined,
                        { revalidate: true, populateCache: false }
                    ),
                    // 아이템 상세 데이터
                    mutate(
                        (key) => typeof key === 'string' && key.startsWith('item_details_'),
                        undefined,
                        { revalidate: true, populateCache: false }
                    ),
                    // 댓글 데이터
                    mutate(
                        (key) => typeof key === 'string' && key.startsWith('comments_'),
                        undefined,
                        { revalidate: true, populateCache: false }
                    ),
                    // 사용자 프로필 데이터
                    mutate(
                        (key) => typeof key === 'string' && key.startsWith('user_items_'),
                        undefined,
                        { revalidate: true, populateCache: false }
                    ),
                    // 레시피 데이터
                    mutate(
                        (key) => typeof key === 'string' && key.startsWith('recipes||'),
                        undefined,
                        { revalidate: true, populateCache: false }
                    ),
                    // 검색 결과
                    mutate(
                        (key) => typeof key === 'string' && (key.startsWith('search_') || key.startsWith('popular_')),
                        undefined,
                        { revalidate: true, populateCache: false }
                    )
                ]);

                // 2. 🔄 RefreshContext 등록된 새로고침 함수들 실행
                await triggerRefresh();

                // 3. ⏱️ 최소 1초 새로고침 표시 (사용자 피드백)
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error('❌ Pull-to-Refresh: 갱신 실패', error);
                // 실패해도 최소 피드백은 제공
                await new Promise(resolve => setTimeout(resolve, 800));
            } finally {
                setIsRefreshing(false);
            }
        }
        setIsPulling(false);
        setPullDistance(0);
    }, [isPulling, pullDistance, triggerRefresh]);

    useEffect(() => {
        const handleTouchStartWrapper = (e: TouchEvent) => handleTouchStart(e);
        const handleTouchMoveWrapper = (e: TouchEvent) => handleTouchMove(e);
        const handleTouchEndWrapper = () => handleTouchEnd();

        window.addEventListener("touchstart", handleTouchStartWrapper, { passive: false });
        window.addEventListener("touchmove", handleTouchMoveWrapper, { passive: false });
        window.addEventListener("touchend", handleTouchEndWrapper);

        return () => {
            window.removeEventListener("touchstart", handleTouchStartWrapper);
            window.removeEventListener("touchmove", handleTouchMoveWrapper);
            window.removeEventListener("touchend", handleTouchEndWrapper);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const PullToRefreshIndicator = () => {
        const indicatorStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${pullDistance}px`,
            transition: 'height 0.3s ease-out',
            zIndex: 9999, // 다른 요소들 위에 표시되도록
        };
        const textStyle = {
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
        };

        if (isRefreshing) {
            return (
                <div className="fixed inset-0 bg-white bg-opacity-20 flex items-center justify-center z-50">
                    <SpoonieLogoAnimation isLoading={true} useFullLogo={true} />
                </div>
            );
        }

        return (
            <div style={indicatorStyle} className="overflow-hidden text-center flex items-center justify-center bg-orange-50">
                <div style={textStyle} className="text-orange-500 font-bold">
                    {pullDistance >= PULL_THRESHOLD ? "🔄 놓으면 새로고침" : PULL_TO_REFRESH_TEXT}
                </div>
            </div>
        );
    };

    return { isRefreshing, PullToRefreshIndicator, pullDistance };
};