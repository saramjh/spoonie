
'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { mutate } from 'swr'


import { formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { BellOff, UserCircle2 } from 'lucide-react'

interface Notification {
  id: string;
  created_at: string;
  type: 'like' | 'comment' | 'follow' | 'recipe_cited' | 'admin';
  is_read: boolean;
  item_id: string | null;
  from_profile: {
    public_id: string;
    username: string;
    avatar_url: string;
  } | null;
  related_item: {
    item_type: 'recipe' | 'post';
  } | null;
}

export default function NotificationsPage() {
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ title: '로그인 필요', description: '알림을 보려면 로그인이 필요합니다.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          created_at,
          type,
          is_read,
          item_id,
          from_profile:profiles!notifications_from_user_id_fkey ( public_id, username, avatar_url ),
          related_item:items!notifications_item_id_fkey ( item_type )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: '알림 불러오기 실패', description: "알림을 불러오는 중 오류가 발생했습니다. " + error.message, variant: 'destructive' });
      } else {
        // 데이터 변환 처리
        const transformedData: Notification[] = (data || []).map((item: any) => ({
          id: item.id,
          created_at: item.created_at,
          type: item.type,
          is_read: item.is_read,
          item_id: item.item_id,
          from_profile: Array.isArray(item.from_profile) 
            ? item.from_profile[0] || null 
            : item.from_profile,
          related_item: Array.isArray(item.related_item) 
            ? item.related_item[0] || null 
            : item.related_item,
        }));
        setNotifications(transformedData);
      }
      setLoading(false);
    };

    fetchUserAndNotifications();

    // 🎯 폴링 기반 알림 시스템 (비용 효율적)
    const pollInterval = setInterval(() => {
      // 페이지가 활성 상태일 때만 폴링
      if (!document.hidden && currentUser?.id) {
        fetchUserAndNotifications();
      }
    }, 30000); // 30초마다 체크

    return () => {
      clearInterval(pollInterval);
    };
  }, [supabase, toast, currentUser?.id]);

  // 🔔 개별 알림 읽음 처리
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      toast({ title: '읽음 처리 실패', description: error.message, variant: 'destructive' });
    } else {
      setNotifications((prev) => {
        const updated = prev.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif));
        
        // 🔔 Header 뱃지 수 업데이트 (읽지 않은 알림 수 다시 계산)
        const unreadCount = updated.filter(notif => !notif.is_read).length;
        if (currentUser?.id) {
          mutate(`unread_notifications_count_${currentUser.id}`, unreadCount);
        }
        
        return updated;
      });
    }
  };

  // 🔔 모든 읽지 않은 알림 읽음 처리 (뱃지 초기화)
  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.id) return;

    const unreadNotifications = notifications.filter(notif => !notif.is_read);
    if (unreadNotifications.length === 0) return;

    

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    if (error) {
      console.error('❌ 모든 알림 읽음 처리 실패:', error);
    } else {
      // 🎯 로컬 상태 업데이트
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      
      // 🔔 Header 뱃지 즉시 업데이트 (SWR 캐시 갱신)
      mutate(`unread_notifications_count_${currentUser.id}`, 0);
      
      
    }
  }, [currentUser?.id, notifications, supabase]);

  // 🔔 알림 페이지 접속 즉시 뱃지 초기화 (UX 개선)
  useEffect(() => {
    if (currentUser?.id) {
      // 🚀 즉시 뱃지를 0으로 만들어서 사용자에게 빠른 피드백 제공
      mutate(`unread_notifications_count_${currentUser.id}`, 0);
    }
  }, [currentUser?.id]);

  // 🔔 알림 페이지 접근 시 모든 읽지 않은 알림 읽음 처리 (백그라운드)
  useEffect(() => {
    if (currentUser?.id && notifications.length > 0) {
      // 2초 후에 실제 읽음 처리 (사용자가 알림을 확인할 시간 제공)
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentUser?.id, notifications.length, markAllAsRead]);
  
  const generateNotificationMessage = (notification: Notification) => {
    const itemType = notification.related_item?.item_type;
    const itemName = itemType === 'recipe' ? '레시피를' : '레시피드를';
    const itemNameWithParticle = itemType === 'recipe' ? '레시피에' : '레시피드에';
    
    switch (notification.type) {
      case 'like':
        return `님이 회원님의 ${itemName} 좋아합니다.`;
      case 'comment':
        return `님이 회원님의 ${itemNameWithParticle} 댓글을 남겼습니다.`;
      case 'follow':
        return `님이 팔로우하기 시작했습니다.`;
      case 'recipe_cited':
        return `님이 회원님의 레시피를 참고하여 새로운 ${itemName} 작성했습니다.`;
      case 'admin':
        return '관리자로부터 새로운 공지가 있습니다.';
      default:
        return '새로운 알림이 있습니다.';
    }
  };

  // 🎯 알림 타입에 따른 올바른 링크 생성
  const getNotificationLink = (notification: Notification): string => {
    // 팔로우 알림: 팔로우한 사용자의 프로필로 이동
    if (notification.type === 'follow') {
      const fromUserPublicId = notification.from_profile?.public_id;
      return fromUserPublicId ? `/profile/${fromUserPublicId}` : '/';
    }

    // 좋아요/댓글/대댓글/참고레시피 알림: item_id가 없으면 홈으로
    if (!notification.item_id) {
      return '/';
    }

    // 좋아요/댓글/대댓글/참고레시피 알림: item_type에 따라 경로 결정
    const itemType = notification.related_item?.item_type;
    if (itemType === 'recipe') {
      return `/recipes/${notification.item_id}`;
    } else if (itemType === 'post') {
      return `/posts/${notification.item_id}`;
    } else {
      // item_type이 없거나 알 수 없는 경우 홈으로
      console.warn(`⚠️ 알 수 없는 item_type: ${itemType} for notification ${notification.id}`);
      return '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-2xl py-12 text-center">알림을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-2xl py-12">
        <h1 className="text-3xl font-bold mb-8">알림</h1>
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <BellOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>새로운 알림이 없습니다.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            							            <Link href={getNotificationLink(notification)} key={notification.id} onClick={() => !notification.is_read && markAsRead(notification.id)}>
              <div
                className={`p-4 rounded-lg shadow-sm flex items-start space-x-4 cursor-pointer transition-colors ${notification.is_read ? 'bg-gray-50 hover:bg-gray-100 text-gray-600' : 'bg-orange-50 hover:bg-orange-100 text-gray-900 font-medium'}`}
              >
                <div className="flex-shrink-0 w-10 h-10">
                  {notification.from_profile?.avatar_url ? (
                    <Image src={notification.from_profile.avatar_url} alt={notification.from_profile.username} width={40} height={40} className="rounded-full object-cover w-full h-auto" />
                  ) : (
                    <UserCircle2 className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="flex-grow">
                  <p>
                    <span className="font-bold">{notification.from_profile?.username || 'Spoonie'}</span>
                    {generateNotificationMessage(notification)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true, locale: ko })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="flex-shrink-0 self-center">
                     <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
      </div>
    </div>
  );
}
