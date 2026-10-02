'use client'

import Link from "next/link";
import { useRouter } from "@/lib/navigation"
import { Button } from "@/components/ui/button";
import { Bell, Bookmark } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import useSWR from 'swr';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { NOTIFICATION_RECEIVED_EVENT } from '@/lib/realtime-events';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { default as NextImage } from 'next/image';
import LoginPromptSheet from "@/components/auth/LoginPromptSheet";

const fetchUnreadNotificationsCount = async (userId: string) => {
  if (!userId) return 0;
  const supabase = createSupabaseBrowserClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread notifications count:', error.message);
    return 0;
  }
  return count || 0;
};

export default function Header() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const isShaking = false; // No animation state needed currently
  const [showBookmarkPrompt, setShowBookmarkPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const { data: unreadCount, mutate } = useSWR(
    user ? `unread_notifications_count_${user.id}` : null,
    () => fetchUnreadNotificationsCount(user!.id),
    // 새 알림은 아래 실시간 구독으로 즉시 반영한다. 폴링은 연결이 끊겼을 때를 위한 안전장치다.
    { refreshInterval: 300000 }
  );

  // 내게 온 새 알림만 구독해 배지와 알림 목록을 즉시 갱신한다
  useRealtimeRefresh({
    channel: `notifications:${user?.id}`,
    table: 'notifications',
    filter: user ? `user_id=eq.${user.id}` : null,
    onChange: () => {
      mutate();
      window.dispatchEvent(new Event(NOTIFICATION_RECEIVED_EVENT));
    },
  });

  useEffect(() => {
    if (!user) return;

    // 폴링 기반 알림 배지 (실시간 연결 제거)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        mutate(); // 탭이 다시 활성화될 때 즉시 데이터 갱신
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, mutate]);

  // 북마크 클릭 핸들러
  const handleBookmarkClick = () => {
    if (!user) {
      setShowBookmarkPrompt(true);
      return;
    }
    // 회원이면 링크 이동 (Next.js 라우터 사용)
    router.push('/bookmarks');
  };

  // 알림 클릭 핸들러
  const handleNotificationClick = () => {
    if (!user) {
      setShowNotificationPrompt(true);
      return;
    }
    // 회원이면 링크 이동 (Next.js 라우터 사용)
    router.push('/notifications');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-paper pl-4 pr-1.5">
      <Link href="/" className="flex-shrink-0" aria-label="Spoonie 홈">
        <NextImage 
          src="/logo-full.svg" 
          alt="Spoonie" 
          width={100} 
          height={32} 
          priority 
        />
      </Link>

      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-11 w-11" 
          onClick={handleBookmarkClick}
          aria-label="저장한 글"
        >
          <Bookmark className="h-6 w-6 text-ink-soft" aria-hidden />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-11 w-11" 
          onClick={handleNotificationClick}
          aria-label={unreadCount ? `알림, 읽지 않은 알림 ${unreadCount}개` : "알림"}
        >
          <Bell aria-hidden className={`h-6 w-6 text-ink-soft ${isShaking ? 'animate-bell-shake' : ''}`} />
          {unreadCount != null && unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-micro tabular-nums text-ink ring-2 ring-paper">
              {unreadCount < 100 ? unreadCount : '99+'}
            </span>
          )}
        </Button>
      </div>

      {/* 토스 스타일 로그인 유도 바텀시트들 */}
      <LoginPromptSheet
        isOpen={showBookmarkPrompt}
        onClose={() => setShowBookmarkPrompt(false)}
        action="bookmark"
      />
      
      <LoginPromptSheet
        isOpen={showNotificationPrompt}
        onClose={() => setShowNotificationPrompt(false)}
        action="notification"
      />
    </header>
  );
}
