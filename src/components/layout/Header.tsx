'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell, Bookmark } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { default as NextImage } from 'next/image';

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
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [isShaking, setIsShaking] = useState(false);

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
    { refreshInterval: 30000 } // 30초마다 폴링
  );

  // 🔔 폴링 기반으로 전환되어 실시간 알림 핸들러 불필요

  useEffect(() => {
    if (!user) return;

    // 🎯 폴링 기반 알림 배지 (실시간 연결 제거)
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

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <Link href="/" className="flex-shrink-0">
        <NextImage 
          src="/logo-full.svg" 
          alt="Spoonie Logo" 
          width={100} 
          height={32} 
          priority 
        />
      </Link>

      <div className="flex items-center gap-2">
        <Link href="/bookmarks">
          <Button variant="ghost" size="icon" className="rounded-full relative">
            <Bookmark className="h-6 w-6 text-gray-600" />
          </Button>
        </Link>
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="rounded-full relative">
            <Bell className={`h-6 w-6 text-gray-600 ${isShaking ? 'animate-bell-shake' : ''}`} />
            {unreadCount != null && unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white ring-2 ring-white">
                {unreadCount < 100 ? unreadCount : '99+'}
              </span>
            )}
          </Button>
        </Link>
      </div>
    </header>
  );
}
