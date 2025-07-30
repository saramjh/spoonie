
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

import { usePathname } from 'next/navigation'
import { formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { BellRing, BellOff, UserCircle2 } from 'lucide-react'

interface Notification {
  id: string;
  created_at: string;
  type: 'like' | 'comment' | 'follow' | 'admin';
  is_read: boolean;
  post_id: string | null;
  from_profile: {
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

  const pathname = usePathname();
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
          post_id,
          from_profile:profiles!notifications_from_user_id_fkey ( username, avatar_url ),
          related_item:items!notifications_post_id_fkey ( item_type )
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
          post_id: item.post_id,
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

    // 🚀 Optimistic Updates 시스템에서는 복잡한 등록 로직 불필요

    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser?.id}` },
        (payload) => {
          fetchUserAndNotifications();
          toast({ title: '새 알림', description: '새로운 알림이 도착했습니다.' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // 🚀 Optimistic Updates: 등록 해제 로직 불필요
    };
  }, [supabase, toast, currentUser?.id]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      toast({ title: '읽음 처리 실패', description: error.message, variant: 'destructive' });
    } else {
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif))
      );
    }
  };
  
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
      case 'admin':
        return '관리자로부터 새로운 공지가 있습니다.';
      default:
        return '새로운 알림이 있습니다.';
    }
  };

  if (loading) {
    return <div className="container mx-auto max-w-2xl py-12 text-center">알림을 불러오는 중...</div>;
  }

  return (
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
            							<Link href={notification.post_id ? `/posts/${notification.post_id}` : '#'} key={notification.id} onClick={() => !notification.is_read && markAsRead(notification.id)}>
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
  );
}
