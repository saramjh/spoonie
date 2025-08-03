/**
 * 🆓 완전 무료 푸시 알림 훅
 * Web Push API + Netlify Functions 사용
 */

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'your-vapid-public-key';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotification() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // 브라우저 푸시 지원 여부 확인
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkCurrentSubscription();
    }
  }, []);

  const checkCurrentSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const currentSubscription = await registration.pushManager.getSubscription();
        if (currentSubscription) {
          setIsSubscribed(true);
          setSubscription(currentSubscription.toJSON() as PushSubscription);
        }
      }
    } catch (error) {
      console.error('❌ 구독 상태 확인 실패:', error);
    }
  };

  const subscribeToPush = async () => {
    if (!isSupported) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.');
      return false;
    }

    setIsLoading(true);

    try {
      // 1. 알림 권한 요청
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('푸시 알림 권한이 필요합니다.');
        return false;
      }

      // 2. Service Worker 등록 확인
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.error('Service Worker가 등록되지 않았습니다.');
        return false;
      }

      // 3. 푸시 구독 생성
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      const subscriptionData = newSubscription.toJSON() as PushSubscription;

      // 4. 🆓 Supabase에 구독 정보 저장 (무료 플랜)
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 먼저 기존 레코드 확인
        const { data: existing } = await supabase
          .from('user_push_settings')
          .select('id')
          .eq('user_id', user.id)
          .single();

        let error;
        if (existing) {
          // 기존 레코드 업데이트
          const result = await supabase
            .from('user_push_settings')
            .update({
              subscription_data: subscriptionData,
              enabled: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
          error = result.error;
        } else {
          // 새 레코드 생성
          const result = await supabase
            .from('user_push_settings')
            .insert({
              user_id: user.id,
              subscription_data: subscriptionData,
              enabled: true
            });
          error = result.error;
        }

        if (error) {
          console.error('❌ 구독 정보 저장 실패:', error);
          return false;
        }
      }

      setSubscription(subscriptionData);
      setIsSubscribed(true);
      console.log('✅ 푸시 알림 구독 완료!');
      return true;

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

      // Supabase에서 구독 정보 제거
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
      console.log('✅ 푸시 알림 구독 해제 완료!');

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
    unsubscribeFromPush
  };
}

// VAPID 키 변환 유틸리티
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}