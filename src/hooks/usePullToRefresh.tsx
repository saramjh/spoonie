import { useState, useEffect, useRef, useCallback } from "react";
import { useRefresh } from "@/contexts/RefreshContext";
import SpoonieLogoAnimation from "@/components/common/SpoonieLogoAnimation";

const PULL_THRESHOLD = 80; // 당겨야 하는 최소 거리 (px)
const PULL_TO_REFRESH_TEXT = "당겨서 새로고침";

export const usePullToRefresh = () => {
    const { isRefreshing, triggerRefresh } = useRefresh();
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
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
            await triggerRefresh();
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
                <div className="fixed inset-0 bg-white bg-opacity-10 flex items-center justify-center z-50">
                    <SpoonieLogoAnimation isLoading={true} useFullLogo={true} />
                </div>
            );
        }

        return (
            <div style={indicatorStyle} className="overflow-hidden text-center flex items-center justify-center bg-orange-50">
                <div style={textStyle} className="text-orange-500 font-bold">
                    {PULL_TO_REFRESH_TEXT}
                </div>
            </div>
        );
    };

    return { isRefreshing, PullToRefreshIndicator, pullDistance };
};