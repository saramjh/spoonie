'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { mutate } from 'swr'
import { formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { BellOff, UserCircle2, X, MoreVertical, Trash2, CheckSquare, Square, Heart, MessageCircle, UserPlus, ChefHat, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // 복수 선택 관련 상태
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 편집 모드 토글 (선택 상태 초기화 포함)
  const toggleEditMode = useCallback(() => {
    setIsSelecting(prev => !prev);
    setSelectedIds(new Set());
  }, []);

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

  // 🗑️ 개별 알림 삭제 (업계표준 방식)
  const deleteNotification = useCallback(async (id: string) => {
    if (!currentUser?.id) return;

    // 🚀 낙관적 업데이트: UI에서 즉시 제거
    const originalNotifications = notifications;
    setNotifications(prev => prev.filter(notif => notif.id !== id));

    // 🔔 Header 뱃지 즉시 업데이트
    const remainingUnreadCount = notifications.filter(notif => notif.id !== id && !notif.is_read).length;
    mutate(`unread_notifications_count_${currentUser.id}`, remainingUnreadCount);

    try {
      // 서버에서 실제 삭제
      const { error, count } = await supabase
        .from('notifications')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', currentUser.id); // 보안: 본인 알림만 삭제

      if (error) {
        throw error;
      }

      if (count === 0) {
        throw new Error('삭제할 알림을 찾을 수 없습니다. (이미 삭제되었거나 권한이 없습니다)');
      }

      toast({
        title: "알림 삭제",
        description: "알림이 삭제되었습니다.",
        variant: "default"
      });

    } catch (error: any) {
      // 🔄 실패 시 롤백
      setNotifications(originalNotifications);
      const originalUnreadCount = originalNotifications.filter(notif => !notif.is_read).length;
      mutate(`unread_notifications_count_${currentUser.id}`, originalUnreadCount);

      toast({
        title: "삭제 실패",
        description: error.message || "알림 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }, [currentUser?.id, notifications, supabase, toast]);

  // 🗑️ 복수 선택 삭제 (업계표준 방식)
  const deleteBatchNotifications = useCallback(async () => {
    if (!currentUser?.id || selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    
    // 🚀 낙관적 업데이트: UI에서 즉시 제거
    const originalNotifications = notifications;
    setNotifications(prev => prev.filter(notif => !selectedIds.has(notif.id)));
    setSelectedIds(new Set());
    setIsSelecting(false);

    // 🔔 Header 뱃지 즉시 업데이트
    const remainingUnreadCount = notifications.filter(notif => !selectedIds.has(notif.id) && !notif.is_read).length;
    mutate(`unread_notifications_count_${currentUser.id}`, remainingUnreadCount);

    try {
      const { error, count } = await supabase
        .from('notifications')
        .delete({ count: 'exact' })
        .in('id', idsToDelete)
        .eq('user_id', currentUser.id);

      if (error) {
        throw error;
      }

      toast({
        title: "알림 삭제",
        description: `${idsToDelete.length}개의 알림이 삭제되었습니다.`,
        variant: "default"
      });

    } catch (error: any) {
      // 🔄 실패 시 롤백
      setNotifications(originalNotifications);
      setSelectedIds(new Set(idsToDelete));
      setIsSelecting(true);
      const originalUnreadCount = originalNotifications.filter(notif => !notif.is_read).length;
      mutate(`unread_notifications_count_${currentUser.id}`, originalUnreadCount);

      toast({
        title: "삭제 실패",
        description: error.message || "일괄 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }, [currentUser?.id, notifications, selectedIds, supabase, toast]);

  // ✅ 전체 선택/해제
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  }, [notifications, selectedIds.size]);

  // 📝 개별 선택/해제
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

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

  // 🎨 토스 스타일 알림 타입별 아이콘과 색상
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return { icon: Heart, color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'comment':
        return { icon: MessageCircle, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'follow':
        return { icon: UserPlus, color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'recipe_cited':
        return { icon: ChefHat, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
      case 'admin':
        return { icon: Bell, color: 'text-purple-500', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' };
      default:
        return { icon: Bell, color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
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
      return '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* 🎨 로딩 상태 헤더 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">알림</h1>
            <div className="w-12 h-7 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
        </div>
        
        {/* 🔄 토스 스타일 스켈레톤 */}
        <div className="px-4 pb-6">
          <div className="space-y-1 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-gray-100 rounded-md animate-pulse w-20"></div>
                    <div className="h-4 bg-gray-100 rounded-md animate-pulse flex-1"></div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-md animate-pulse w-16"></div>
                </div>
                <div className="w-2 h-2 bg-gray-100 rounded-full animate-pulse flex-shrink-0 mt-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 🎨 토스 스타일 헤더 */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">알림</h1>
            {notifications.length > 0 && !isSelecting && (
              <div className="px-2 py-1 bg-gray-100 rounded-full">
                <span className="text-xs font-medium text-gray-600">{notifications.length}</span>
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={toggleEditMode}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isSelecting 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {isSelecting ? '완료' : '편집'}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-6">
        {/* 🎯 토스 스타일 편집 모드 툴바 */}
        {isSelecting && notifications.length > 0 && (
          <div className="sticky top-[73px] z-10 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  {selectedIds.size === notifications.length ? (
                    <div className="w-5 h-5 bg-blue-600 rounded border flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-blue-300 rounded bg-white"></div>
                  )}
                  <span>전체선택</span>
                </button>
                {selectedIds.size > 0 && (
                  <div className="h-4 w-px bg-blue-200"></div>
                )}
                {selectedIds.size > 0 && (
                  <span className="text-sm font-medium text-blue-600">
                    {selectedIds.size}개 선택
                  </span>
                )}
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={deleteBatchNotifications}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>삭제</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <BellOff className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">아직 알림이 없어요</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                새로운 좋아요나 댓글이 있으면<br/>
                여기서 확인할 수 있어요
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => {
                const iconConfig = getNotificationIcon(notification.type);
                const IconComponent = iconConfig.icon;
                
                return (
                  <div
                    key={notification.id}
                    className={`group relative transition-all duration-300 ease-out ${
                      isSelecting && selectedIds.has(notification.id)
                        ? 'bg-blue-50 border-blue-200 border rounded-xl scale-[0.98] shadow-sm'
                        : ''
                    }`}
                    onClick={() => {
                      // 🎯 토스 스타일 햅틱 피드백 (브라우저 지원 시)
                      if (navigator.vibrate && isSelecting) {
                        navigator.vibrate(10);
                      }
                      
                      if (isSelecting) {
                        toggleSelect(notification.id);
                      } else {
                        if (!notification.is_read) markAsRead(notification.id);
                        router.push(getNotificationLink(notification));
                      }
                    }}
                  >
                    <div className={`p-4 flex items-start gap-3 cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                      isSelecting && selectedIds.has(notification.id)
                        ? 'bg-transparent'
                        : notification.is_read 
                          ? 'hover:bg-gray-50 active:bg-gray-100' 
                          : 'bg-blue-50/30 hover:bg-blue-50/50 active:bg-blue-50/70'
                    } ${!isSelecting && !notification.is_read ? 'border-l-4 border-l-blue-400' : ''}`}>
                      
                      {/* ✅ 토스 스타일 체크박스 */}
                      {isSelecting && (
                        <div className="flex-shrink-0 self-start mt-1">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            selectedIds.has(notification.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 bg-white hover:border-blue-400'
                          }`}>
                            {selectedIds.has(notification.id) && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                                <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* 🎭 프로필 이미지 + 타입 아이콘 */}
                      <div className="flex-shrink-0 relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shadow-sm">
                          {notification.from_profile?.avatar_url ? (
                            <Image 
                              src={notification.from_profile.avatar_url} 
                              alt={notification.from_profile.username} 
                              width={40} 
                              height={40} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <UserCircle2 className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        {/* 🎨 타입별 아이콘 배지 */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${iconConfig.bgColor} ${iconConfig.borderColor} border flex items-center justify-center`}>
                          <IconComponent className={`h-2.5 w-2.5 ${iconConfig.color}`} />
                        </div>
                      </div>
                      
                      {/* 📝 알림 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed ${
                              notification.is_read ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                              <span className={`font-semibold ${
                                notification.is_read ? 'text-gray-700' : 'text-gray-900'
                              }`}>
                                {notification.from_profile?.username || 'Spoonie'}
                              </span>
                              <span className="ml-1">
                                {generateNotificationMessage(notification)}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                              {formatDistanceToNowStrict(new Date(notification.created_at), { 
                                addSuffix: true, 
                                locale: ko 
                              })}
                            </p>
                          </div>
                          
                          {/* 🔴 읽지 않음 표시 & 삭제 버튼 */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
                            )}
                            {!isSelecting && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
                                title="알림 삭제"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}