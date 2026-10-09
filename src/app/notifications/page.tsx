'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js';
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client'
import { useToast } from '@/hooks/use-toast'
import { mutate } from 'swr'
import { formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from '@/shared/lib/navigation'
import Link from 'next/link'
import PushNotificationSettings from '@/features/notification/components/PushNotificationSettings'
import { NOTIFICATION_RECEIVED_EVENT } from '@/shared/infra/realtime-events';
import { CheckBox, PageHeader, Sheet, StateSheet } from "@/components/kit"
import type { Notification } from "@/features/notification/contracts"
import { toNotifications } from "@/features/notification/domain/notification-rows"
import { countNotifications, deleteNotifications, fetchNotificationRows, markAllNotificationsRead, markNotificationRead } from "@/features/notification/data/notification-repository"


export default function NotificationsPage() {
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const userId: string | undefined = currentUser?.id;
  
  // 복수 선택 관련 상태
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 편집 모드 토글 (선택 상태 초기화 포함)
  const toggleEditMode = useCallback(() => {
    setIsSelecting(prev => !prev);
    setSelectedIds(new Set());
  }, []);

  // 알림 데이터 가져오기 함수 (독립적으로 분리)
  const fetchUserAndNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // 비로그인 방문은 예상된 상태다. 오류 토스트 대신 가치 안내 화면을 보여 준다.
      return;
    }
    setCurrentUser(user);

    // 서버 부담 최소화: 최신 알림 개수만 먼저 확인
    const newCount = await countNotifications(supabase, user.id);

    // 개수가 같으면 데이터 요청 생략 (서버 자원 절약)
    if (newCount === notifications.length && notifications.length > 0) {
      return;
    }

    const { rows, error } = await fetchNotificationRows(supabase, user.id); // 최근 50개만 로드 (대역폭 절약)

    if (error) {
      toast({ title: '알림 불러오기 실패', description: "알림을 불러오는 중 오류가 발생했습니다. " + error.message, variant: 'destructive' });
    } else {
      // 데이터 변환 처리
      const transformedData: Notification[] = toNotifications(rows);
      setNotifications(transformedData);
    }
  }, [supabase, toast, notifications.length]);

  // 초기 로딩
  useEffect(() => {
    // 받은 뒤에만 상태를 바꾼다 (첫 상태는 loading=true로 시작)
    const load = async () => {
      await fetchUserAndNotifications();
      setLoading(false);
    };
    load();
  }, [fetchUserAndNotifications, refreshTrigger]);

  // 목록 갱신: 탭으로 돌아올 때, 푸시를 받았을 때, 헤더의 실시간 구독이 새 알림을 받았을 때 (주기적 조회는 하지 않는다)
  useEffect(() => {
    if (!userId) return;

    // 2️⃣ Page Visibility API (탭 전환 시 즉시 새로고침)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUserAndNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3️⃣ Service Worker 메시지 리스너
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_RECEIVED') {
        setRefreshTrigger(prev => prev + 1); // 강제 새로고침 트리거
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // 4️⃣ 헤더의 실시간 구독이 새 알림을 받으면 목록을 다시 불러온다
    const handleRealtimeNotification = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener(NOTIFICATION_RECEIVED_EVENT, handleRealtimeNotification);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      window.removeEventListener(NOTIFICATION_RECEIVED_EVENT, handleRealtimeNotification);
    };
  }, [userId, fetchUserAndNotifications]);

  // 개별 알림 읽음 처리
  const markAsRead = async (id: string) => {
    const { error } = await markNotificationRead(supabase, id);

    if (error) {
      toast({ title: '읽음 처리 실패', description: error.message, variant: 'destructive' });
    } else {
      setNotifications((prev) => {
        const updated = prev.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif));
        
        // Header 뱃지 수 업데이트 (읽지 않은 알림 수 다시 계산)
        const unreadCount = updated.filter(notif => !notif.is_read).length;
        if (userId) {
          mutate(`unread_notifications_count_${userId}`, unreadCount);
        }
        
        return updated;
      });
    }
  };

  const deleteBatchNotifications = useCallback(async () => {
    if (!userId || selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    
    // 낙관적 업데이트: UI에서 즉시 제거
    const originalNotifications = notifications;
    setNotifications(prev => prev.filter(notif => !selectedIds.has(notif.id)));
    setSelectedIds(new Set());
    setIsSelecting(false);

    // Header 뱃지 즉시 업데이트
    const remainingUnreadCount = notifications.filter(notif => !selectedIds.has(notif.id) && !notif.is_read).length;
    mutate(`unread_notifications_count_${userId}`, remainingUnreadCount);

    try {
      const { error } = await deleteNotifications(supabase, idsToDelete, userId);

      if (error) {
        throw error;
      }

      toast({
        title: "알림 삭제",
        description: `${idsToDelete.length}개의 알림이 삭제되었습니다.`,
        variant: "default"
      });

    } catch (error: unknown) {
      // 실패 시 롤백
      setNotifications(originalNotifications);
      setSelectedIds(new Set(idsToDelete));
      setIsSelecting(true);
      const originalUnreadCount = originalNotifications.filter(notif => !notif.is_read).length;
      mutate(`unread_notifications_count_${userId}`, originalUnreadCount);

      toast({
        title: "삭제 실패",
        description: (error instanceof Error && error.message) || "일괄 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }, [userId, notifications, selectedIds, supabase, toast]);

  // 전체 선택/해제
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  }, [notifications, selectedIds.size]);

  // 개별 선택/해제
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

  // 모든 읽지 않은 알림 읽음 처리 (뱃지 초기화)
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const unreadNotifications = notifications.filter(notif => !notif.is_read);
    if (unreadNotifications.length === 0) return;

    const { error } = await markAllNotificationsRead(supabase, userId);

    if (error) {
      console.error('❌ 모든 알림 읽음 처리 실패:', error);
    } else {
      // 로컬 상태 업데이트
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      );
      
      // Header 뱃지 즉시 업데이트 (SWR 캐시 갱신)
      mutate(`unread_notifications_count_${userId}`, 0);
    }
  }, [userId, notifications, supabase]);

  // 알림 페이지 접속 즉시 뱃지 초기화 (UX 개선)
  useEffect(() => {
    if (userId) {
      // 즉시 뱃지를 0으로 만들어서 사용자에게 빠른 피드백 제공
      mutate(`unread_notifications_count_${userId}`, 0);
    }
  }, [userId]);

  // 알림 페이지 접근 시 모든 읽지 않은 알림 읽음 처리 (백그라운드)
  useEffect(() => {
    if (userId && notifications.length > 0) {
      // 2초 후에 실제 읽음 처리 (사용자가 알림을 확인할 시간 제공)
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [userId, notifications.length, markAllAsRead]);
  
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
      case 'recipe_cited': {
        // 관계 종류에 따라 다르게 알린다: 만들어 봄 / 참고한 레시피드 / 이어 쓴 레시피
        const origin = notification.related_item?.creation_origin;
        if (itemType === 'recipe') return `님이 회원님의 레시피를 참고해 새 레시피를 썼어요.`;
        if (origin === 'recipe_detail' || origin === 'cook_mode') return `님이 회원님의 레시피로 만들어 봤어요.`;
        return `님이 회원님의 레시피를 참고해 레시피드를 남겼어요.`;
      }
     case 'admin':
        return '관리자로부터 새로운 공지가 있습니다.';
      default:
        return '새로운 알림이 있습니다.';
    }
  };

  // 알림 타입에 따른 올바른 링크 생성
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
      <div className="min-h-screen bg-paper">
        {/* 로딩 상태 헤더 */}
        <div className="sticky top-0 z-10 bg-paper border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <h1 className="text-title text-ink">알림</h1>
            <div className="w-12 h-7 bg-muted rounded-lg animate-pulse"></div>
          </div>
        </div>
        
        <div className="px-4 pb-6">
          <div className="space-y-1 mt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-muted rounded-md animate-pulse w-20"></div>
                    <div className="h-4 bg-muted rounded-md animate-pulse flex-1"></div>
                  </div>
                  <div className="h-3 bg-muted rounded-md animate-pulse w-16"></div>
                </div>
                <div className="w-2 h-2 bg-muted rounded-full animate-pulse flex-shrink-0 mt-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div>
        <PageHeader title="알림" />
        <div className="px-3 pt-3">
          <StateSheet
            headingLevel="h2"
            title="내 요리에 관한 소식을 확인하세요."
            body="댓글, 좋아요, 다른 사람이 내 레시피를 참고한 기록을 알림에서 확인할 수 있어요."
            action={
              <div className="w-full">
                <Button asChild className="w-full"><Link href="/login?next=%2Fnotifications">로그인하고 알림 보기</Link></Button>
                <p className="mt-3 text-center text-label text-ink-soft">
                  처음이라면 <Link href="/signup?next=%2Fnotifications" className="font-semibold text-ink underline underline-offset-4">계정 만들기</Link>
                </p>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length

  return (
    <div className="min-h-screen">
      <PageHeader
        title="알림"
        trailing={
          notifications.length > 0 ? (
            <Button variant="ghost" onClick={toggleEditMode} className="text-label">
              {isSelecting ? "완료" : "편집"}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 px-3 pb-6 pt-3">
        {currentUser && !isSelecting && <PushNotificationSettings />}

        {isSelecting && notifications.length > 0 && (
          <Sheet className="sticky top-14 z-10 flex items-center justify-between px-2">
            <button type="button" onClick={toggleSelectAll} role="checkbox" aria-checked={allSelected} className="flex h-12 items-center gap-2 px-2 text-label text-ink">
              <CheckBox checked={allSelected} />
              전체 선택
              {selectedIds.size > 0 && <span className="tabular-nums text-ink-soft">· {selectedIds.size}개</span>}
            </button>
            <Button variant="outline" onClick={deleteBatchNotifications} disabled={selectedIds.size === 0} className="text-destructive">
              <Trash2 className="h-4 w-4" aria-hidden />
              지우기
            </Button>
          </Sheet>
        )}

        {notifications.length === 0 ? (
          <StateSheet title="아직 알림이 없어요" body="누가 내 레시피로 만들었거나, 좋아요·댓글을 남기면 여기에 쌓여요." />
        ) : (
          <Sheet as="ul" className="divide-y divide-border">
            {notifications.map((notification) => {
              const selected = selectedIds.has(notification.id)
              const unread = !notification.is_read
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    role={isSelecting ? "checkbox" : undefined}
                    aria-checked={isSelecting ? selected : undefined}
                    onClick={() => {
                      if (isSelecting) {
                        toggleSelect(notification.id)
                      } else {
                        if (unread) markAsRead(notification.id)
                        router.push(getNotificationLink(notification))
                      }
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left ${unread && !isSelecting ? "bg-muted" : ""}`}
                  >
                    {isSelecting && <span className="pt-2.5"><CheckBox checked={selected} /></span>}
                    <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-border">
                      {notification.from_profile?.avatar_url ? (
                        <Image src={notification.from_profile.avatar_url} alt="" width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-semibold text-ink-soft">
                          {(notification.from_profile?.username || "스").charAt(0)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-body ${unread ? "text-ink" : "text-ink-soft"}`}>
                        <span className="font-semibold text-ink">{notification.from_profile?.username || "Spoonie"}</span>{" "}
                        {generateNotificationMessage(notification)}
                      </span>
                      <span className="mt-0.5 block text-meta text-ink-soft">
                        {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true, locale: ko })}
                        {unread && <span className="sr-only"> · 읽지 않음</span>}
                      </span>
                    </span>
                    {unread && !isSelecting && <span aria-hidden className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-ink" />}
                  </button>
                </li>
              )
            })}
          </Sheet>
        )}
      </div>
    </div>
  )
}
