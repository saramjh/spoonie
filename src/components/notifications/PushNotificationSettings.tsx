/**
 * 🆓 무료 푸시 알림 설정 컴포넌트
 * 사용자가 푸시 알림을 켜고 끌 수 있는 UI
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

export default function PushNotificationSettings() {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
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
            description: "이제 브라우저가 닫혀있어도 알림을 받을 수 있습니다!",
          });
        }
      }
    } catch (error) {
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
          description: "잠시 후 푸시 알림이 표시됩니다!",
        });
      } else {
        toast({
          title: "테스트 실패",
          description: "푸시 알림 발송에 실패했습니다.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "테스트 오류",
        description: "테스트 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-ink" />
            푸시 알림 미지원
          </CardTitle>
          <CardDescription>
            현재 브라우저에서는 푸시 알림을 지원하지 않습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // 푸시 알림이 켜져 있을 때 축소된 UI
  if (isSubscribed && !isExpanded) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader 
          className="cursor-pointer hover:bg-door transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle className="text-sm">푸시 알림 활성화됨</CardTitle>
                <CardDescription className="text-xs">
                  실시간 알림을 받고 있습니다
                </CardDescription>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-ink-soft" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <CardTitle>푸시 알림 설정</CardTitle>
          </div>
          {isSubscribed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          브라우저가 닫혀있어도 새로운 댓글, 좋아요, 팔로우 알림을 받을 수 있습니다.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-ink-soft" />
            )}
            <div>
              <p className="font-medium">
                {isSubscribed ? '푸시 알림 켜짐' : '푸시 알림 꺼짐'}
              </p>
              <p className="text-sm text-ink-soft">
                {isSubscribed 
                  ? '실시간 알림을 받고 있습니다' 
                  : '브라우저가 열려있을 때만 알림을 받습니다'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleTogglePush}
            disabled={isLoading}
            variant={isSubscribed ? "outline" : "default"}
            className="w-full"
          >
            {isLoading ? (
              "처리 중..."
            ) : isSubscribed ? (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                푸시 알림 끄기
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                푸시 알림 켜기
              </>
            )}
          </Button>

          {isSubscribed && process.env.NODE_ENV === 'development' && (
            <Button
              onClick={handleTestPush}
              variant="secondary"
              className="w-full"
              size="sm"
            >
              테스트 알림 보내기
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}