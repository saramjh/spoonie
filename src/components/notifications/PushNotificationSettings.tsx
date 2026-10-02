/**
 * 🆓 무료 푸시 알림 설정 컴포넌트
 * 사용자가 푸시 알림을 켜고 끌 수 있는 UI
 */

'use client';

import { Button } from '@/components/ui/button';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Sheet } from "@/components/kit"

export default function PushNotificationSettings() {
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscription,
    subscribeToPush,
    unsubscribeFromPush
  } = usePushNotification();

  const handleTogglePush = async () => {
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
        toast({
          title: "푸시 알림 해제됨",
          description: "더 이상 푸시 알림을 받지 않습니다.",
        });
      } else {
        const success = await subscribeToPush();
        if (success) {
          toast({
            title: "푸시 알림 활성화됨",
            description: "앱을 닫아도 새 소식을 알려 드려요.",
          });
        }
      }
    } catch {
      toast({
        title: "오류가 발생했습니다",
        description: "푸시 알림 설정 중 문제가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleTestPush = async () => {
    if (!subscription) {
      toast({
        title: "구독 정보 없음",
        description: "푸시 알림 구독 정보를 찾을 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      // 개발 환경에서는 테스트 API 사용, 프로덕션에서는 Netlify Functions 사용
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/test-push' 
        : '/.netlify/functions/send-push';
      
      const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "로그인 필요",
          description: "테스트 알림을 보내려면 다시 로그인해주세요.",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subscription: subscription,
          notification: {
            title: '테스트 알림',
            body: '푸시 알림이 정상적으로 작동합니다.',
            type: 'test',
            url: '/notifications'
          }
        })
      });

      if (response.ok) {
        toast({
          title: "테스트 알림 발송됨",
          description: "잠시 후 휴대폰 알림이 올 거예요.",
        });
      } else {
        toast({
          title: "테스트 실패",
          description: "푸시 알림 발송에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "테스트 오류",
        description: "테스트 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 한 줄 설정: 무엇을 받는지와 켜고 끄는 버튼 하나
  if (!isSupported) {
    return (
      <p className="rounded-[3px] bg-paper px-4 py-3 text-meta text-ink-soft shadow-sheet">
        이 브라우저에서는 휴대폰 알림을 받을 수 없어요. 홈 화면에 스푸니를 추가하면 받을 수 있어요.
      </p>
    )
  }

  return (
    <Sheet as="section" className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-label font-semibold text-ink">휴대폰 알림 {isSubscribed ? "켜짐" : "꺼짐"}</h2>
        <p className="mt-0.5 text-meta text-ink-soft">
          {isSubscribed ? "앱을 닫아도 만들었어요·댓글·좋아요·팔로우를 알려 드려요." : "켜면 앱을 닫아도 새 소식을 알려 드려요."}
        </p>
        {isSubscribed && process.env.NODE_ENV === "development" && (
          <button type="button" onClick={handleTestPush} className="mt-1 text-meta text-ink underline underline-offset-4">
            테스트 알림 보내기
          </button>
        )}
      </div>
      <Button onClick={handleTogglePush} disabled={isLoading} variant={isSubscribed ? "outline" : "default"} className="flex-shrink-0">
        {isLoading ? "처리 중" : isSubscribed ? "끄기" : "켜기"}
      </Button>
    </Sheet>
  )
}
