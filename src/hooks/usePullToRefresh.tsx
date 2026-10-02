import { useState, useEffect, useRef } from "react";
import { revalidateStartingWith } from '@/lib/swr-cache';
import SpoonieLogo from "@/components/brand/SpoonieLogo";

const PULL_THRESHOLD = 80; // 놓으면 새로고침되는 거리 (px)
const PULL_MAX = PULL_THRESHOLD + 50;
const DECIDE_DISTANCE = 10; // 이만큼 움직인 뒤에 "당기기인지 스크롤인지" 정한다
const PULL_TO_REFRESH_TEXT = "당겨서 새로고침";

// 터치가 시작된 곳이 이미 위로 스크롤된 안쪽 영역(시트·모달·목록)이거나, 열린 대화상자 안이면 새로고침을 하지 않는다
function startsInsideScrolledArea(target: EventTarget | null): boolean {
    let el = target instanceof Element ? target : null;
    while (el && el !== document.body) {
        if (el.closest('[role="dialog"], [data-no-pull-refresh]')) return true;
        const overflowY = getComputedStyle(el).overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true;
        el = el.parentElement;
    }
    return false;
}

/**
 * 맨 위에서 아래로 당겨 화면의 목록을 다시 받는다.
 *
 * 스크롤과 다투지 않게:
 * - 페이지가 맨 위일 때 시작한 터치만 후보가 된다. 시트·모달 안이나 위로 스크롤된 안쪽 영역은 제외한다.
 * - 처음 10px은 지켜본다. 아래로 곧게 내려갔을 때만 당기기로 정하고, 위·옆이면 이번 터치는 스크롤에 넘긴다.
 * - 당기는 중에 페이지가 맨 위를 벗어나면 바로 그만둔다.
 */
export const usePullToRefresh = () => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const gesture = useRef<{ x: number; y: number; state: "idle" | "deciding" | "pulling" }>({ x: 0, y: 0, state: "idle" });
    const distanceRef = useRef(0);
    const refreshingRef = useRef(false);

    useEffect(() => {
        const setDistance = (d: number) => {
            distanceRef.current = d;
            setPullDistance(d);
        };
        const reset = () => {
            gesture.current.state = "idle";
            if (distanceRef.current) setDistance(0);
        };

        const onStart = (e: TouchEvent) => {
            if (refreshingRef.current || e.touches.length > 1 || window.scrollY > 0 || startsInsideScrolledArea(e.target)) {
                gesture.current.state = "idle";
                return;
            }
            gesture.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, state: "deciding" };
        };

        const onMove = (e: TouchEvent) => {
            const g = gesture.current;
            if (g.state === "idle") return;
            if (window.scrollY > 0) return reset();
            const dx = e.touches[0].clientX - g.x;
            const dy = e.touches[0].clientY - g.y;

            if (g.state === "deciding") {
                if (Math.abs(dx) < DECIDE_DISTANCE && Math.abs(dy) < DECIDE_DISTANCE) return;
                // 아래로, 옆보다 확실히 세로로 움직였을 때만 당기기
                if (dy > 0 && dy > Math.abs(dx) * 1.5) {
                    g.state = "pulling";
                    g.y = e.touches[0].clientY; // 지켜본 거리만큼 튀지 않게 여기서부터 잰다
                    return;
                }
                return reset();
            }

            if (dy <= 0) return setDistance(0);
            e.preventDefault(); // 당기는 동안만 스크롤을 막는다
            setDistance(Math.min(dy * 0.6, PULL_MAX)); // 손가락보다 덜 따라오게
        };

        const onEnd = async () => {
            const pulled = gesture.current.state === "pulling" && distanceRef.current >= PULL_THRESHOLD;
            reset();
            if (!pulled) return;
            refreshingRef.current = true;
            setIsRefreshing(true);
            try {
                // 지금 화면에 떠 있는 목록을 서버에서 다시 받는다 (무한 스크롤 목록 포함, lib/swr-cache)
                await Promise.all([
                    revalidateStartingWith(['items|', 'recipes||', 'user_items_', 'comments_', 'search_', 'popular_', 'explore|']),
                    new Promise((resolve) => setTimeout(resolve, 800)), // 새로고침 표시를 너무 짧게 깜빡이지 않게
                ]);
            } catch (error) {
                console.error('새로고침 실패', error);
            } finally {
                refreshingRef.current = false;
                setIsRefreshing(false);
            }
        };

        window.addEventListener("touchstart", onStart, { passive: true });
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("touchend", onEnd);
        window.addEventListener("touchcancel", reset);
        return () => {
            window.removeEventListener("touchstart", onStart);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend", onEnd);
            window.removeEventListener("touchcancel", reset);
        };
    }, []);

    const PullToRefreshIndicator = () => {
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
        if (!pullDistance) return null;
        return (
            <div style={{ height: pullDistance }} className="absolute inset-x-0 top-0 z-50 flex items-center justify-center overflow-hidden bg-door text-center">
                <div style={{ opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }} className="text-meta font-medium text-ink-soft">
                    {pullDistance >= PULL_THRESHOLD ? "놓으면 새로고침" : PULL_TO_REFRESH_TEXT}
                </div>
            </div>
        );
    };

    return { isRefreshing, PullToRefreshIndicator, pullDistance };
};
