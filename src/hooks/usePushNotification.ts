/**
 * 웹 푸시 구독 관리 훅
 *
 * 브라우저 구독을 만들고 user_push_settings에 저장한다. 실제 발송은 서버가 한다
 * (알림 저장 → DB 트리거 → netlify/functions/push-dispatch).
 *
 * VAPID 키가 교체되면 기존 구독으로는 발송이 실패하고, 기존 구독이 남아 있으면 새 키로 구독할 수도 없다.
 * 그래서 저장된 구독의 키가 현재 키와 다르면 해지하고, 알림 권한이 이미 있으면 새 키로 다시 구독한다.
 */

import { useState, useEffect } from 'react';
import { useHydrated } from '@/hooks/useHydrated';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotification() {
  // 화면이 뜬 뒤 브라우저 기능으로 판단한다 (서버 렌더와 어긋나지 않게)
  const hydrated = useHydrated();
  const isSupported = hydrated && 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);

  // 구독을 만들고 서버에 저장한다 (권한은 이미 허용된 상태여야 한다)
  const createAndSaveSubscription = async (registration: ServiceWorkerRegistration): Promise<boolean> => {
    const newSubscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const subscriptionData = newSubscription.toJSON() as PushSubscriptionData;

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('user_push_settings')
        .upsert(
          { user_id: user.id, subscription_data: subscriptionData, enabled: true, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) {
        console.error('❌ 구독 정보 저장 실패:', error);
        return false;
      }
    }

    setSubscription(subscriptionData);
    setIsSubscribed(true);
    return true;
  };

  const checkCurrentSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      const currentSubscription = await registration.pushManager.getSubscription();
      if (!currentSubscription) return;

      if (usesCurrentKey(currentSubscription)) {
        setIsSubscribed(true);
        setSubscription(currentSubscription.toJSON() as PushSubscriptionData);
        return;
      }

      // 이전 VAPID 키로 만든 구독: 해지하고, 이미 허용된 사용자라면 새 키로 다시 구독한다
      await currentSubscription.unsubscribe();
      if (Notification.permission === 'granted') {
        await createAndSaveSubscription(registration);
      }
    } catch (error) {
      console.error('❌ 구독 상태 확인 실패:', error);
    }
  };

  // 지원되는 브라우저면 지금 구독 상태를 한 번 확인한다
  useEffect(() => {
    if (!isSupported) return;
    const check = async () => {
      await checkCurrentSubscription();
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);

  const subscribeToPush = async () => {
    if (!isSupported) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.');
      return false;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('푸시 알림 권한이 필요합니다.');
        return false;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.error('Service Worker가 등록되지 않았습니다.');
        return false;
      }

      // 다른 키로 만든 구독이 남아 있으면 새 구독이 거부되므로 먼저 해지한다
      const existing = await registration.pushManager.getSubscription();
      if (existing && !usesCurrentKey(existing)) {
        await existing.unsubscribe();
      }

      return await createAndSaveSubscription(registration);
    } catch (error) {
      console.error('❌ 푸시 구독 실패:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const currentSubscription = await registration.pushManager.getSubscription();
        if (currentSubscription) {
          await currentSubscription.unsubscribe();
        }
      }

      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_push_settings')
          .update({ enabled: false })
          .eq('user_id', user.id);
      }

      setSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error('❌ 구독 해제 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscription,
    subscribeToPush,
    unsubscribeFromPush,
  };
}

// 구독이 현재 VAPID 공개키로 만들어졌는지 확인
function usesCurrentKey(subscription: PushSubscription): boolean {
  const key = subscription.options?.applicationServerKey;
  if (!key) return false;
  const current = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const used = new Uint8Array(key);
  return used.length === current.length && used.every((byte, i) => byte === current[i]);
}

// VAPID 키 변환 유틸리티
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
