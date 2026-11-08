'use client'

import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js';
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client'
import { useToast } from '@/hooks/use-toast'
import { mutate } from 'swr'
import { formatDistanceToNowStrict } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Trash2, Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { useRouter } from '@/shared/lib/navigation'
import Link from 'next/link'
import PushNotificationSettings from '@/features/notification/components/PushNotificationSettings'
import { NOTIFICATION_RECEIVED_EVENT } from '@/shared/infra/realtime-events';
import { CheckBox, Sheet, StateSheet } from "@/components/kit"
import type { Notification } from "@/features/notification/contracts"
import { toNotifications } from "@/features/notification/domain/notification-rows"
import { deleteNotifications, fetchNotificationRows, markAllNotificationsRead, markNotificationRead } from "@/features/notification/data/notification-repository"


export default function NotificationsPage() {
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const userId: string | undefined = currentUser?.id;
  
  // 복수 선택 관련 상태
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pushSettingsOpen, setPushSettingsOpen] = useState(false);

  // 편집 모드 토글 (선택 상태 초기화 포함)
  const toggleEditMode = useCallback(() => {
    setIsSelecting(prev => !prev);
    setSelectedIds(new Set());
  }, []);

  // 알림 데이터 가져오기 함수 (독립적으로 분리)
  const fetchUserAndNotifications = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      // Missing session is the expected guest state, not an unavailable service.
      if (authError && authError.name !== "AuthSessionMissingError") throw authError

      if (!user) {
        setCurrentUser(null)
        setNotifications([])
        setLoadError(null)
        return
      }
      setCurrentUser(user)

      // The count may remain unchanged while read states or content change on another device.
      // Fetch the current rows for every explicit refresh instead of hiding stale results.
      const { rows, error } = await fetchNotificationRows(supabase, user.id)
      if (error) throw error
      setNotifications(toNotifications(rows))
      setLoadError(null)
    } catch (error) {
      // Do not turn a failed auth/network check into an empty notification list.
      setLoadError('알림을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.')
      console.error('알림 불러오기 실패', error)
    }
  }, [supabase])

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

  // Opening the list must not mark unread items as read.
  // Only explicit per-item actions or "모두 읽음" change stored read state.

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

  const pageHeading = (
    <div className="flex min-h-[66px] items-center justify-between gap-3 px-4 pb-2 pt-5">
      <h1 className="text-title font-semibold text-ink">알림</h1>
      {loading ? (
        <Skeleton className="h-7 w-12 rounded-lg" />
      ) : !loadError && currentUser ? (
        <div className="flex items-center gap-1">
          {notifications.length > 0 && notifications.some((item) => !item.is_read) && (
            <Button variant="outline" type="button" onClick={() => void markAllAsRead()} className="h-10 px-3 text-meta">
              모두 읽음
            </Button>
          )}
          {notifications.length > 0 && (
            <Button type="button" variant="ghost" onClick={toggleEditMode} className="h-10 px-2 text-label">
              {isSelecting ? "완료" : "편집"}
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11"
            onClick={() => setPushSettingsOpen(true)} aria-label="푸시 알림 설정">
            <Bell className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        {pageHeading}
        <ul aria-label="알림 불러오는 중" aria-busy="true" className="px-3 py-3">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="flex min-h-[76px] items-start gap-3 border-b border-border px-2 py-3">
              <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-paper">
        {pageHeading}
        <div className="px-3 pt-3" role="alert">
          <StateSheet title="알림을 불러오지 못했어요" body={loadError}
            action={<Button type="button" onClick={() => { setLoading(true); setRefreshTrigger((n) => n + 1) }}>다시 시도</Button>} />
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div>
        {pageHeading}
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
      {pageHeading}

      <div className="space-y-3 px-3 pb-6 pt-3">
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
          <ul className="divide-y divide-border bg-paper">
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
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left ${unread && !isSelecting ? "bg-paper-tint" : ""}`}
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
          </ul>
        )}
      </div>
      <Drawer open={pushSettingsOpen} onOpenChange={setPushSettingsOpen} shouldScaleBackground={false}>
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl px-4 pb-6 pt-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-title font-semibold text-ink">푸시 알림</DrawerTitle>
            <Button type="button" variant="ghost" size="icon" onClick={() => setPushSettingsOpen(false)} aria-label="닫기">
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>
          <DrawerDescription className="mt-3 text-label leading-relaxed text-ink-soft">새 소식 알림을 받을지 선택해 주세요.</DrawerDescription>
          <div className="mt-4"><PushNotificationSettings /></div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
