import { useState, useEffect, useRef, useCallback } from "react";
import { revalidateStartingWith } from '@/lib/swr-cache';
import SpoonieLogo from "@/components/brand/SpoonieLogo";

const PULL_THRESHOLD = 80; // 당겨야 하는 최소 거리 (px)
const PULL_TO_REFRESH_TEXT = "당겨서 새로고침";

/**
 * 완전한 Pull-to-Refresh 시스템
 * PWA 환경에서 네트워크 오류/캐시 문제 시 실제 데이터 갱신 수행
 */
export const usePullToRefresh = () => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const touchStartRef = useRef(0);

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
                
                // 1. 지금 화면에 떠 있는 목록을 서버에서 다시 받는다 (무한 스크롤 목록 포함, lib/swr-cache)
                await revalidateStartingWith(['items|', 'recipes||', 'user_items_', 'comments_', 'search_', 'popular_', 'explore|']);

                // 2. 최소 1초는 새로고침 표시를 보여 준다
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
    }, [isPulling, pullDistance]);

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
                <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-3" role="status" aria-label="새로 불러오는 중">
                    <span className="flex items-center gap-2 rounded-full bg-paper py-1.5 pl-2 pr-4 text-label font-medium text-ink shadow-sheet">
                        <SpoonieLogo variant="icon" motion="stir" className="h-6 w-6" title="" />
                        새로 불러오는 중
                    </span>
                </div>
            );
        }

        return (
            <div style={indicatorStyle} className="overflow-hidden text-center flex items-center justify-center bg-door">
                <div style={textStyle} className="text-meta font-medium text-ink-soft">
                    {pullDistance >= PULL_THRESHOLD ? "놓으면 새로고침" : PULL_TO_REFRESH_TEXT}
                </div>
            </div>
        );
    };

    return { isRefreshing, PullToRefreshIndicator, pullDistance };
};